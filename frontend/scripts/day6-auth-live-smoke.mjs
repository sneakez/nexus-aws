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
  let roleChecks=0, tokenVersion=0;
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setRequestInterception(true);
  p.on('request',r=>{
   const u=new URL(r.url());
   const headers={'access-control-allow-origin':base,'access-control-allow-headers':'authorization,content-type,apikey,x-client-info,x-supabase-api-version','access-control-allow-methods':'GET,POST'};
   const respond=(status,data)=>r.respond({status,headers,contentType:'application/json',body:JSON.stringify(data)});
   if(u.pathname.startsWith('/auth/v1/')){
    if(r.method()==='OPTIONS')return void r.respond({status:204,headers});
    const now=Math.floor(Date.now()/1000); tokenVersion++;
    const user={id:userId,email:'owner@fixture.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Tài khoản kiểm tra'},created_at:'2026-11-05T00:00:00Z'};
    const jwt=[{alg:'HS256',typ:'JWT'},{sub:userId,role:'authenticated',aud:'authenticated',iat:now,exp:now+3600,jti:String(tokenVersion)}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.')+'.fixture';
    return void respond(200,{access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user});
   }
   if(u.pathname.startsWith('/rest/v1/'))return void respond(500,{message:'Profile REST must not be called by live auth'});
   if(u.pathname.startsWith('/api/')){
    if(r.method()==='OPTIONS')return void r.respond({status:204,headers});
    if(u.pathname==='/api/v1/session/me'){roleChecks++;return void respond(200,{userId,roles:role==='unassigned'?[]:[role]});}
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
   await p.evaluate(() => { window.__auditWorkspace = document.querySelector('[data-testid=workspace]'); });
   if(role!=='warehouse'){
    await p.evaluate(()=>[...document.querySelectorAll('aside button')].find(button=>button.textContent.trim()==='Đơn hàng').click());
    await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Tạo đơn hàng'));
    await p.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Tạo đơn hàng').click());
    await p.waitForSelector('input[name=orderNumber]');
    await p.$eval('input[name=orderNumber]',input=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(input,'DRAFT-KEEP-ON-FOCUS');input.dispatchEvent(new Event('input',{bubbles:true}));});
   }
   const checksBeforeFocus=roleChecks;
   await p.evaluate(async()=>{
    const {supabase}=await import('/src/lib/liveSupabase.ts');
    const {data}=await supabase.auth.getSession();
    const {error}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
    if(error)throw error;
   });
   const otherTab=await context.newPage();await otherTab.bringToFront();await p.bringToFront();await otherTab.close();
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert(await p.evaluate(()=>window.__auditWorkspace===document.querySelector('[data-testid=workspace]')),'workspace preserved on focus');
   assert.equal(roleChecks,checksBeforeFocus,'same session focus does not revalidate');
   const refreshedRole=p.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/session/me',{timeout:10000});
   await p.evaluate(async()=>{
    const {supabase}=await import('/src/lib/liveSupabase.ts');
    const {error}=await supabase.auth.refreshSession();if(error)throw error;
   });
   await refreshedRole;
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert(roleChecks>checksBeforeFocus,'new token revalidates backend role');
   assert(await p.evaluate(()=>window.__auditWorkspace===document.querySelector('[data-testid=workspace]')),'workspace preserved during token refresh');
   if(role!=='warehouse')assert.equal(await p.$eval('input[name=orderNumber]',input=>input.value),'DRAFT-KEEP-ON-FOCUS','draft preserved');
   assert.equal(await p.evaluate(()=>localStorage.getItem('nexus_mock_db_v2')),null);
   await p.$eval('button[title="Đăng xuất"]',el=>el.click());
   await p.waitForSelector('#login-email');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS real login/restore/focus/refresh/logout: '+role+' (HTTP fixtures).');
  await context.close();
 }
} finally {await b.close();}
