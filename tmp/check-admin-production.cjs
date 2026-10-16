async function run(email, password, base = 'http://127.0.0.1:3012', paths = ['/admin','/admin/claim-activity','/admin/orders','/admin/orders?page=999','/admin/px-orders','/admin/claims','/admin/claims?page=999','/admin/px-claims','/admin/order-cancellations','/admin/order-cancellations?status=ALL&q=test']) {
  const login = await fetch(base + '/api/admin/login', {method:'POST', body:new URLSearchParams({email,password}), redirect:'manual'});
  if (login.headers.get('location') !== '/admin') throw new Error('Login incomplete');
  const cookie = login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  for (let round=1; round<=3; round++) {
    for (const path of paths) {
      const start=performance.now();
      const response=await fetch(base+path,{headers:{cookie},redirect:'manual'});
      const body=await response.text();
      const error=/"digest":"[0-9]+"/.test(body) || body.includes('NEXT_REDIRECT');
      console.log(JSON.stringify({round,path,status:response.status,ms:Math.round(performance.now()-start),error}));
      if(response.status!==200 || error) throw new Error('Page failed: '+path);
    }
  }
}
module.exports={run};
