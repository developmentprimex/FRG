require('../frontend/node_modules/dotenv').config({path:'frontend/.env', quiet:true});
const { PrismaClient } = require('../frontend/node_modules/@prisma/client');
const Stripe = require('../frontend/node_modules/stripe');
(async () => {
  const prisma = new PrismaClient();
  try {
    const contractNumber = process.argv[process.argv.indexOf('--contract') + 1] || '111105820';
    const orders = await prisma.testOrder.findMany({where:{contractNumber},orderBy:{createdAt:'desc'},take:2,
      select:{orderNumber:true,paymentStatus:true,createdAt:true,stripeCheckoutSessionId:true}});
    console.log(JSON.stringify({savedOrders:orders.map(({stripeCheckoutSessionId,...order})=>order)}));
    if (process.argv.includes('--connection')) {
      if (!process.env.STRIPE_TEST_SECRET_KEY) throw new Error('Stripe test key is not configured');
      const stripe = new Stripe(process.env.STRIPE_TEST_SECRET_KEY, {maxNetworkRetries:0, timeout:10000});
      const balance = await stripe.balance.retrieve();
      console.log(JSON.stringify({stripeConnection:'ok',livemode:balance.livemode}));
      if (process.argv.includes('--diagnose') && orders[0]?.stripeCheckoutSessionId) {
        const order = orders[0];
        const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId,{expand:['payment_intent']});
        const intent = session.payment_intent;
        const stored = await prisma.stripePaymentEvent.count({where:{orderNumber:order.orderNumber,orderKind:'test'}});
        const failed = await stripe.events.list({type:'payment_intent.payment_failed',created:{gte:Math.floor(new Date(order.createdAt).getTime()/1000)},limit:100});
        const related = failed.data.filter(event=>event.data.object.id === intent?.id || event.data.object.metadata?.orderNumber === order.orderNumber);
        const endpoints = await stripe.webhookEndpoints.list({limit:100});
        console.log(JSON.stringify({checkoutStatus:session.status,paymentStatus:session.payment_status,
          paymentIntentStatus:intent?.status || null,errorCode:intent?.last_payment_error?.code || null,
          providerFailedEvents:related.length,storedPaymentEvents:stored,
          fragmentoWebhookDestinations:endpoints.data.filter(endpoint=>/\/api\/stripe\/(test-webhook|webhook)/.test(endpoint.url)).map(endpoint=>({url:endpoint.url,status:endpoint.status,events:endpoint.enabled_events}))}));
      }
    }
  } catch (error) {
    console.log(JSON.stringify({errorType:error.type || error.name,errorCode:error.code || null})); process.exitCode=1;
  } finally { await prisma.$disconnect(); }
})();
