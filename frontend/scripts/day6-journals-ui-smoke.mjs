// Real browser + HTTP fixtures. No request reaches a real API or database.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const origin='http://localhost:5173';
const debit='b1768ec2-2148-4f3f-a7af-b945cc88b006',credit='f2987e87-8261-4a10-a366-eb66396d630f';
const accounts=[{id:debit,code:'TEST-DEBIT',name:'Kiểm thử Nợ'},{id:credit,code:'TEST-CREDIT',name:'Kiểm thử Có'}];
const browser=await puppeteer.launch({headless:true});
let checks=0;
function check(condition,label){assert(condition,label);checks++;}
try {
 const page=await browser.newPage();await page.setViewport({width:1280,height:900});
 let role='manager',drop=false,catalogFail=true,apiCalls=0;
 const journals=new Map(),writes=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setRequestInterception(true);
 page.on('request',req=>{
  const u=new URL(req.url());
  if(u.pathname==='/src/main.tsx') return void req.respond({status:200,contentType:'application/javascript',body:
   "import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import { CashWorkingCapitalPage } from '/src/features/finance/pages/CashWorkingCapitalScreen.tsx';import '/src/index.css';ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(CashWorkingCapitalPage));"});
  if((u.pathname==='/src/providers/AuthProvider.tsx'||u.pathname==='/src/providers/LiveAuthProvider.tsx')) return void req.respond({status:200,contentType:'application/javascript',body:
   'export function useAuth(){return '+JSON.stringify({session:{access_token:'fixture',user:{id:'journal-user'}},activeRole:role})+'} export function useRole(){return {isManager:true}}'});
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST'};
  const respond=(status,data)=>req.respond({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname.startsWith('/api/')) {
   if(req.method()==='OPTIONS') return void req.respond({status:204,headers});
   apiCalls++;
   if(role==='warehouse') return void respond(403,{});
   if(u.pathname==='/api/v1/ledger-accounts') return void respond(catalogFail?503:200,catalogFail?{}:accounts);
   if(u.pathname==='/api/v1/journals'&&req.method()==='POST') {
    const body=JSON.parse(req.postData());writes.push(body);
    const previous=journals.get(body.id);
    if(previous) return void respond(200,previous);
    if([...journals.values()].some(j=>j.entryNumber===body.entryNumber)) return void respond(409,{message:'Số chứng từ đã tồn tại.'});
    const result={...body,postedAt:'2026-11-05T05:00:00Z'};journals.set(body.id,result);
    if(drop){drop=false;return void req.abort('failed');}
    return void respond(201,result);
   }
   if(u.pathname.startsWith('/api/v1/journals/')) {
    const result=journals.get(u.pathname.split('/').at(-1));return void respond(result?200:404,result??{});
   }
   return void respond(501,{});
  }
  if(u.origin!==origin)return void req.abort();
  void req.continue();
 });
 async function click(text){
  const buttons=await page.$$('button');
  for(const button of buttons)if((await button.evaluate(el=>el.textContent)).trim()===text){
   await button.scrollIntoView();await button.click();return;
  }
  throw new Error('Missing button '+text);
 }
 async function set(selector,value){
  const element=await page.$(selector);await element.click();await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await element.type(value);
 }
 async function fillTwo(first='0.1',second='0.3'){
  await page.select('[aria-label="Tài khoản dòng 1"]',debit);
  await page.select('[aria-label="Tài khoản dòng 2"]',credit);
  await set('[aria-label="Số tiền dòng 1"]',first);await set('[aria-label="Số tiền dòng 2"]',second);
 }
 await page.goto(origin,{waitUntil:'networkidle0'});
 await page.waitForSelector('[role="alert"]');
 check(await page.$('#journals-title')!==null,'real journal route selected');
 catalogFail=false;await click('Tải lại tài khoản');
 await page.waitForFunction(()=>!document.body.innerText.includes('Đang tải tài khoản kế toán'));
 await click('Tạo bút toán');
 await page.waitForSelector('[aria-label="Tài khoản dòng 1"] option[value="'+debit+'"]');
 await fillTwo();
 await click('Ghi sổ bút toán');
 await page.waitForFunction(()=>document.body.innerText.includes('tổng Nợ phải bằng tổng Có'));
 check(writes.length===0,'unbalanced journal never posted');
 await click('Thêm dòng');
 await page.select('[aria-label="Tài khoản dòng 3"]',debit);await set('[aria-label="Số tiền dòng 3"]','0.2');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Tổng bút toán"]')?.textContent.includes('Đã cân bằng'));
 check(await page.$eval('[aria-label="Tổng bút toán"]',el=>el.textContent.includes('0,3')),'exact cents 0.1 + 0.2 = 0.3');
 drop=true;await click('Ghi sổ bút toán');
 await page.waitForFunction(()=>document.body.innerText.includes('Chưa xác nhận được kết quả ghi sổ.'));
 check(writes.length===1,'one initial journal POST');
 check(await page.$eval('[aria-label="Số chứng từ"]',el=>el.closest('fieldset').disabled),'freeze uncertain journal');
 await click('Đóng, giữ yêu cầu');await page.reload({waitUntil:'networkidle0'});
 await click('Tạo bút toán');await click('Kiểm tra lại bút toán');
 await page.waitForSelector('[aria-label="Chi tiết bút toán"]');
 check(writes.length===2 && JSON.stringify(writes[0])===JSON.stringify(writes[1]),'same journal ID/content survives reload');
 check(journals.size===1,'one journal in fixture');
 check(await page.$$eval('[aria-label="Chi tiết bút toán"] tbody tr',els=>els.length)===3,'all journal lines shown');
 const id=writes[0].id;
 await click('Tra cứu bút toán');await page.waitForSelector('[aria-label="Chi tiết bút toán"]');
 check(await page.$eval('[aria-label="Chi tiết bút toán"]', (el,id)=>el.textContent.includes(id),id),'lookup same journal');
 check(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('nexus-pending-journal:')).length)===0,'pending journal cleared');

 // A new ID with an existing entry number conflicts without changing the first journal.
 await click('Tạo bút toán');await fillTwo('100','100');
 await set('[aria-label="Số chứng từ"]',writes[0].entryNumber);
 await click('Ghi sổ bút toán');await page.waitForFunction(()=>document.body.innerText.includes('Số chứng từ đã tồn tại.'));
 check(journals.size===1,'conflict does not add journal');
 check(await page.$eval('[aria-label="Số tiền dòng 1"]',el=>el.value)==='100','conflict preserves draft');
 await set('[aria-label="Số chứng từ"]','JOURNAL-NEW-002');await click('Ghi sổ bút toán');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Chi tiết bút toán"] h2')?.textContent==='JOURNAL-NEW-002');
 check(journals.size===2,'edited draft can create distinct journal');

 // Narrow viewport and allowed admin. Warehouse must not make financial requests.
 await page.setViewport({width:390,height:844});role='admin';
 await page.reload({waitUntil:'networkidle0'});await click('Tạo bút toán');await fillTwo('100000.01','100000.01');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile layout contains form');
 if(process.env.NEXUS_UI_SCREENSHOTS)await page.screenshot({path:process.env.NEXUS_UI_SCREENSHOTS+'/journals-mobile.png',fullPage:true});
 check(await page.$('[aria-label="Tạo bút toán"]')!==null,'admin form available');
 role='warehouse';apiCalls=0;await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('[role="alert"]');
 check(!(await page.$$eval('button',els=>els.some(el=>el.textContent.trim()==='Tạo bút toán'))),'warehouse form hidden');
 check(apiCalls===0,'warehouse sends no journal/account calls');
 check(errors.length===0,errors.join('; '));
 console.log('PASS: '+checks+' journal UI assertions; exact cents, catalog retry, safe replay, conflict, lookup, admin/warehouse, mobile. HTTP fixtures only.');
}finally{await browser.close();}
