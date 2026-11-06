# Stripe payment diagnostics

Failures, extra authentication, canceled payment intents, unpaid Checkout
completion and session expiry are recorded separately. Each Stripe event has a
unique database key, so webhook retries do not duplicate history. Distinct failed
attempts on the same PaymentIntent remain distinct. Confirmed payments keep a
single journey milestone across receipt-page and webhook updates.

View history in Fragmento Visitors shows the reason, Stripe error/decline codes
and order number. Live order details include Payment history, including orders
without an analytics visitor ID. A session expiring does not reveal why the
customer left. Generic bank declines remain generic. Neither arbitrary Stripe
messages nor full webhook/card payloads are persisted.

The existing live and test webhook endpoints validate signatures before writing.
Apply `20261105150000_stripe_payment_diagnostics` and regenerate Prisma before
serving the updated code. After deployment, the corresponding Stripe webhook
destinations must send these snapshot events:

- `payment_intent.payment_failed`
- `payment_intent.requires_action`
- `payment_intent.canceled`
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Live: `/api/stripe/webhook`; test: `/api/stripe/test-webhook`. Enable all seven
events on each relevant destination in Stripe Workbench. Existing destinations
that already send all events need no subscription change. Local forwarding must
include these same events and use the local listener's signing secret.
No remote webhook subscriptions are changed by this code migration.

Future Checkout sessions copy order and journey metadata into PaymentIntent
metadata. For older PaymentIntents without metadata, the handler finds their
Checkout session through Stripe. Unknown orders from other applications are
ignored. Failed writes return 500 so Stripe can retry. Diagnostics do not charge,
retry or cancel payments. Late unpaid/expired sessions cannot downgrade an
already-paid order or overwrite a newer Checkout session.

Tests (from the repository root):

```powershell
node --test frontend/test/stripe-payment-diagnostics.test.mjs frontend/test/visit-journey.test.mjs frontend/test/public-visit-reports.test.js
node frontend/test/stripe-payment-diagnostics-local-db.mjs
# With the Fragmento dev server running (adjust port if needed):
$env:VISIT_TEST_ORIGIN = 'http://localhost:3001'
node frontend/test/stripe-payment-diagnostics-local-http.mjs
```

The local database test uses synthetic Stripe events against an existing local
test order and removes its generated diagnostic records. It makes no payments
and does not call Stripe. Test/live data remain separated by endpoint and order
kind. StripePaymentEvent is an order audit trail; visit events still follow the
configured visit retention period.

References: https://docs.stripe.com/api/events/types,
https://docs.stripe.com/declines/card,
https://docs.stripe.com/api/checkout/sessions/create.
