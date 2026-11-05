// Browser role audit with intercepted HTTP. Real JWT/database coverage is in NexusOMS.ApiLab.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const base=process.env.UAT_BASE_URL||'http://localhost:5175';
const pages=['dashboard','inventory','orders','fulfillment','returns','customers','orderEconomics','skuEconomics','channelEconomics','pricingCalculator','channelConnections','channelMapping'];
const b=await puppeteer.launch({headless:true});
let count=0;
try{
 for(const role of ['admin','manager','warehouse']){
  const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setRequestInterception(true);
  p.on('request',r=>{
   const u=new URL(r.url());
   const js=body=>r.respond({status:200,contentType:'application/javascript',body});
   if(u.pathname==='/src/main.tsx')return void js("import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import {AppShell} from '/src/app/layout/LiveAppShell.tsx';import '/src/index.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AppShell));");
   if((u.pathname==='/src/providers/AuthProvider.tsx'||u.pathname==='/src/providers/LiveAuthProvider.tsx'))return void js('export const useAuth=()=>('+JSON.stringify({session:{access_token:'fixture',user:{id:'test'}},activeRole:role,profile:{full_name:'Audit '+role},memberships:[]})+');');
   if(u.pathname.startsWith('/api/')){
    const headers={'access-control-allow-origin':base,'access-control-allow-headers':'authorization,content-type'};
    if(r.method()==='OPTIONS')return void r.respond({status:204,headers});
    const orders=[{id:'sample',orderNumber:'AUDIT-01',status:'shipped',total:230000,createdAt:'2026-11-05T00:00:00Z'}];
    return void r.respond({status:200,headers,contentType:'application/json',body:JSON.stringify(u.pathname==='/api/v1/orders'?orders:[])});
   }void r.continue();
  });
  for(const width of [1440,390]){
   await p.setViewport({width,height:950});
   const allowed=role==='warehouse'?pages.slice(0,5):pages;
   for(const page of allowed){
    await p.goto(base+'/app?page='+page,{waitUntil:'networkidle0'});
    await p.waitForSelector('[data-testid=workspace]');
    assert.equal(await p.$eval('main',e=>e.textContent.includes('Không có quyền')),false,role+' '+page);
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),role+' '+page+' overflow');
    assert.equal(await p.$('[aria-label="Thông báo hệ thống"]'),null);
    assert.equal(await p.$eval('aside',e=>e.textContent.includes('Mô phỏng Flash Sale')||e.textContent.includes('Bút toán')),false);
    count++;
   }
  }
  assert.deepEqual(errors,[]); await p.close();
 }
 console.log('PASS: '+count+' role/page/viewport combinations; HTTP fixtures, navigation, no fake notifications, no page overflow.');
}finally{await b.close();}
