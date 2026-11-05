// Exercises the real login UI and LiveAuthProvider. HTTP services are explicit fixtures.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const base=process.env.UAT_BASE_URL||'http://localhost:5175';
const userId='73a73370-2749-4ddc-a063-379b462635da';
const b=await puppeteer.launch({headless:true});
try {
 for(const role of ['admin','manager','warehouse','unassigned']) {
  const context=await b.createBrowserContext();
  const p=await context.newPage();await p.setViewport({width:1440,height:1000});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setRequestInterception(true);
  p.on('request',r=>{
   const u=new URL(r.url());
   const headers={'access-control-allow-origin':base,'access-control-allow-headers':'authorization,content-type,apikey,x-client-info,x-supabase-api-version','access-control-allow-methods':'GET,POST'};
   const respond=(status,data)=>r.respond({status,headers,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname.startsWith('/auth/v1/')){
    if(r.method()==='OPTIONS')return void r.respond({status:204,headers});
    const now=Math.floor(Date.now()/1000);
    const user={id:userId,email:'owner@fixture.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Tài khoản kiểm tra'},created_at:'2026-11-05T00:00:00Z'};
    const jwt=[{alg:'HS256',typ:'JWT'},{sub:userId,role:'authenticated',aud:'authenticated',iat:now,exp:now+3600}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.fixture';
    return void respond(200,{access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user});
   }
   if(u.pathname.startsWith('/rest/v1/'))return void respond(500,{message:'Profile REST must not be called by live auth'});
   if(u.pathname.startsWith('/api/')){
    if(r.method()==='OPTIONS')return void r.respond({status:204,headers});
    if(u.pathname==='/api/v1/session/me')return void respond(200,{userId,roles:role==='unassigned'?[]:[role]});
    return void respond(200,[]);
   }
   void r.continue();
  });
  await p.goto(base+'/login',{waitUntil:'networkidle0'});
  await p.waitForSelector('#login-email');
  assert.equal(await p.$('[data-demo-role]'),null);
  await p.type('#login-email','owner@fixture.invalid');await p.type('#login-password','fixture-only-password');
  await p.$eval('form',form=>form.requestSubmit());
  if(role==='unassigned') {
   await p.waitForSelector('[role=alert]');
   assert(await p.$eval('[role=alert]',el=>/quyền|role/.test(el.textContent)));
  }else{
   await p.waitForSelector('[data-testid=workspace][data-role='+role+']');
   await p.reload({waitUntil:'networkidle0'});
   await p.waitForSelector('[data-testid=workspace][data-role='+role+']');
   assert.equal(await p.evaluate(()=>localStorage.getItem('nexus_mock_db_v2')),null);
   await p.$eval('button[title="Đăng xuất"]',el=>el.click());
   await p.waitForSelector('#login-email');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS real login/session restore/logout: '+role+' (HTTP fixtures).');
  await context.close();
 }
} finally {await b.close();}
