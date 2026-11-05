// Isolated browser contract smoke. Intercepts every /api call; never writes a real database.
// Start the API frontend on localhost:5175 first. Auth here is a fixture, not a JWT validation test.
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const origin = process.env.UAT_BASE_URL || 'http://localhost:5175';
const productId = '592fd15b-a6f6-473f-844d-f5d26f657da0';
const warehouseId = 'a858441b-6bb0-4277-a112-d31e2eb1b17b';
const original = { id: 'original', orderNumber: 'EXISTING-001', status: 'shipped', total: 100000, createdAt: '2026-11-04T09:51:01Z' };
const full = value => ({ ...value, customerId: null, subtotal: 100000, tax: 0, shippingFee: 0,
  items: [{id:'line',productId,productSku:'TEST-SKU',productName:'Sản phẩm kiểm tra',quantity:1,unitPrice:100000,lineTotal:100000,unitCost:60000}] });
const browser = await puppeteer.launch({ headless: true });
let assertions=0;
function check(value, message) { assert(value, message); assertions++; }
try {
 const page = await browser.newPage();
 await page.setViewport({width:1280,height:900});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 let role='manager', mode='success', orders=[original], writes=[], detailFail=false;
 const returnRows=new Map(); const returnWrites=[], feeWrites=[]; const feeRows=[]; let dropReturn=false,feeMode='success',missingCost=false,financeCalls=0;
 const history=new Map(), receipts=new Map(); let opWrites=[], mutationCount=0, dropShip=false, operationConflict=false;
 await page.setRequestInterception(true);
 page.on('request',req=>{
  const u=new URL(req.url());
  if(u.pathname==='/src/main.tsx') return void req.respond({status:200,contentType:'application/javascript',body:
   "import React from '/node_modules/.vite/deps/react.js'; import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js'; import { BackendOrdersPage } from '/src/features/orders/pages/BackendOrdersScreen.tsx'; import '/src/index.css'; ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(BackendOrdersPage));"});
  if((u.pathname==='/src/providers/AuthProvider.tsx'||u.pathname==='/src/providers/LiveAuthProvider.tsx')) return void req.respond({status:200,contentType:'application/javascript',body:
   'export function useAuth(){return '+JSON.stringify({session:{access_token:'ui-fixture',user:{id:'ui-manager'}},activeRole:role})+'}'});
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST'};
  const respond=(status,data)=>req.respond({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(u.pathname.startsWith('/api/')) {
   if(req.method()==='OPTIONS') return void req.respond({status:204,headers});
   if(u.pathname==='/api/v1/products') return void respond(200,[{id:productId,sku:'TEST-SKU',name:'Sản phẩm kiểm tra',isActive:true}]);
   if(u.pathname==='/api/v1/warehouses') return void respond(200,[{id:warehouseId,code:'TEST-WH',name:'Kho kiểm tra',isActive:true}]);
   if(u.pathname==='/api/v1/orders' && req.method()==='GET') return void respond(200,orders);
   if(u.pathname==='/api/v1/orders' && req.method()==='POST') {
    const body=JSON.parse(req.postData()); writes.push(body);
    if(mode==='shortage') return void respond(409,{message:'Không đủ tồn khả dụng.'});
    if(mode==='uncertain') {
     orders.push({...original,id:'created',orderNumber:body.orderNumber,status:'pending'});
     mode='success'; return void req.abort('failed');
    }
    const existing=orders.find(o=>o.orderNumber===body.orderNumber);
    const created=existing??{...original,id:'created',orderNumber:body.orderNumber,status:'pending'};
    if(!existing) orders.push(created);
    return void respond(existing?200:201,full(created));
   }
   if(u.pathname==='/api/v1/returns' && req.method()==='POST') {
    const body=JSON.parse(req.postData()); returnWrites.push(body);
    const existing=returnRows.get(body.id);
    if(existing) return void respond(200,existing);
    const taken=[...returnRows.values()].filter(r=>r.orderId===body.orderId).flatMap(r=>r.items).reduce((s,i)=>s+i.quantity,0);
    if(taken+body.items.reduce((s,i)=>s+i.quantity,0)>1) return void respond(409,{message:'Số lượng trả vượt lượng còn lại.'});
    const result={...body,status:'requested'}; returnRows.set(body.id,result);
    if(dropReturn) {dropReturn=false;return void req.abort('failed');}
    return void respond(201,result);
   }
   if(u.pathname.startsWith('/api/v1/returns/')) {
    const value=returnRows.get(u.pathname.split('/').at(-1));
    return void respond(value?200:404,value??{});
   }
   const feeMatch=u.pathname.match(/^\/api\/v1\/orders\/([^/]+)\/fees$/);
   if(feeMatch) {
    financeCalls++;
    const id=feeMatch[1];
    if(req.method()==='GET') return void respond(200,feeRows.filter(f=>f.orderId===id));
    const body=JSON.parse(req.postData()); feeWrites.push(body);
    if(feeRows.some(f=>f.id===body.id)) return void respond(409,{message:'Mã phí đã tồn tại.'});
    const created={...body,orderId:id}; feeRows.push(created);
    if(feeMode==='uncertain') {feeMode='success';return void req.abort('failed');}
    if(feeMode==='concurrent') {feeMode='success';return void respond(409,{message:'Mã phí đã tồn tại.'});}
    return void respond(201,created);
   }
   const contributionMatch=u.pathname.match(/^\/api\/v1\/orders\/([^/]+)\/contribution$/);
   if(contributionMatch) {
    financeCalls++;
    const id=contributionMatch[1], fees=feeRows.filter(f=>f.orderId===id);
    const operatingCents=fees.filter(f=>f.feeType!=='ads').reduce((s,f)=>s+Math.round(f.amount*100),0);
    const advertisingCents=fees.filter(f=>f.feeType==='ads').reduce((s,f)=>s+Math.round(f.amount*100),0);
    return void respond(200,{orderId:id,revenue:100000,costOfGoods:missingCost?null:60000,operatingFees:operatingCents/100,advertisingFees:advertisingCents/100,
     cm1:missingCost?null:40000,cm2:missingCost?null:(4000000-operatingCents)/100,cm3:missingCost?null:(4000000-operatingCents-advertisingCents)/100,hasCompleteCost:!missingCost});
   }

   const operationMatch=u.pathname.match(/^\/api\/v1\/orders\/([^/]+)\/(confirm|process|ship|cancel)$/);
   if(operationMatch && req.method()==='POST') {
    const [,id,operation]=operationMatch, body=JSON.parse(req.postData());
    opWrites.push({id,operation,body});
    if(role==='warehouse' && ['confirm','cancel'].includes(operation)) return void respond(403,{});
    const previous=receipts.get(body.idempotencyKey);
    if(previous) return void respond(200,{...previous,replayed:true});
    const found=orders.find(o=>o.id===id);
    if(!found) return void respond(404,{});
    if(operationConflict) {operationConflict=false;return void respond(409,{message:'Trạng thái đơn đã thay đổi.'});}
    const target={confirm:'confirmed',process:'processing',ship:'shipped',cancel:'cancelled'}[operation];
    const allowed=operation==='cancel'?['pending','confirmed','processing'].includes(found.status)
      : found.status==={confirm:'pending',process:'confirmed',ship:'processing'}[operation];
    if(!allowed) return void respond(409,{message:'Không thể chuyển trạng thái.'});
    if(operation==='cancel' && !body.reason?.trim()) return void respond(400,{message:'Thiếu lý do hủy.'});
    const fromStatus=found.status; found.status=target; mutationCount++;
    const entry={id:'history-'+mutationCount,fromStatus,toStatus:target,note:body.reason??null,createdBy:'ui-manager',createdAt:'2026-11-05T04:00:00Z'};
    history.set(id,[...(history.get(id)??[]),entry]);
    const result={orderId:id,status:target,replayed:false};
    receipts.set(body.idempotencyKey,result);
    if(dropShip && operation==='ship') {dropShip=false;return void req.abort('failed');}
    return void respond(200,result);
   }
   if(u.pathname.endsWith('/history')) {
    const id=u.pathname.split('/').at(-2);
    return void respond(200,history.get(id)??[]);
   }

   if(u.pathname.startsWith('/api/v1/orders/')) {
    if(detailFail) return void respond(503,{});
    const found=orders.find(o=>o.id===decodeURIComponent(u.pathname.split('/').at(-1)));
    return void respond(found?200:404,found?{...full(found),items:full(found).items.map(i=>({...i,unitCost:role==='warehouse'?null:60000}))}:{});
   }
   return void respond(501,{message:'Not covered by this isolated fixture'});
  }
  if(u.origin!==origin) return void req.abort();
  void req.continue();
 });
 async function clickText(text, selector='button') {
  const buttons=await page.$$(selector);
  for(const button of buttons) {
   if(await button.evaluate((el, label)=>el.getClientRects().length>0 && el.textContent.trim()===label, text)) {
    await button.scrollIntoView();
    await page.waitForFunction(el=>{ const r=el.getBoundingClientRect(); return r.width>0 && r.height>0 && r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight; },{},button);
    await button.click(); return;
   }
  }
  throw new Error('Missing control: '+text);
 }
 async function openForm() {
  await clickText('Tạo đơn hàng');
  await page.waitForSelector('[name="warehouseId"] option[value="'+warehouseId+'"]');
  await page.select('[name="warehouseId"]',warehouseId);
  await page.select('[aria-label="Sản phẩm 1"]',productId);
  await page.type('[aria-label="Đơn giá 1"]','100000');
 }
 async function closeDetail() { await clickText('Đóng chi tiết'); await page.waitForFunction(()=>!document.querySelector('[role="dialog"]')); }
 await page.goto(origin,{waitUntil:'networkidle0'});
 await page.waitForSelector('tbody tr');
 check(await page.$$eval('tbody tr',r=>r.length)===1,'list');
 await clickText('EXISTING-001');
 await page.waitForFunction(()=>document.body.innerText.includes('Giá vốn đơn vị:'));
 check(await page.$eval('[role="dialog"]',e=>e.textContent.includes('Sản phẩm kiểm tra')),'detail products');
 await closeDetail();

 // Server validation retains form fields and unlocks them.
 await openForm();
 await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
 check(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')),'focus remains in modal');
 mode='shortage';
 await clickText('Tạo đơn và giữ hàng');
 await page.waitForFunction(()=>document.body.innerText.includes('Không đủ tồn khả dụng.'));
 check(await page.$eval('[aria-label="Đơn giá 1"]',e=>e.value)==='100000','preserve rejected draft');
 check(await page.$eval('[name="orderNumber"]',e=>!e.disabled && !e.closest('fieldset')?.disabled),'editable after definitive rejection');
 await clickText('Hủy');

 // Commit with dropped response: exact payload/key retained through close/reopen.
 await openForm();
 await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift');
 check(await page.evaluate(()=>!!document.activeElement.closest('[role="dialog"]')),'focus remains in modal');
 mode='uncertain'; writes=[];
 await clickText('Tạo đơn và giữ hàng');
 await page.waitForFunction(()=>document.body.innerText.includes('Chưa xác nhận được kết quả'));
 check(writes.length===1,'one initial POST');
 check(await page.$eval('[name="orderNumber"]',e=>e.closest('fieldset').disabled),'freeze uncertain payload');
 await clickText('Đóng, giữ yêu cầu để kiểm tra sau');
 await clickText('Tạo đơn hàng');
 await clickText('Kiểm tra lại yêu cầu');
 await page.waitForFunction(()=>document.body.innerText.includes('Đã tạo đơn WEB-'));
 await page.waitForSelector('[role="dialog"] li');
 check(writes.length===2 && JSON.stringify(writes[0])===JSON.stringify(writes[1]),'identical replay after reopen');
 check(orders.filter(o=>o.id==='created').length===1,'no duplicate fixture order');
 check(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('nexus-pending-create-order:')).length)===0,'pending cleared on success');
 await closeDetail();
 check(await page.$$eval('tbody tr',r=>r.length)===2,'refresh list after create');

 await page.setViewport({width:390,height:844});
 await openForm();
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile no page overflow');
 if(process.env.NEXUS_UI_SCREENSHOTS) await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
 if(process.env.NEXUS_UI_SCREENSHOTS) await page.screenshot({path:process.env.NEXUS_UI_SCREENSHOTS+'/orders-create-mobile.png',fullPage:true});
 await clickText('Hủy');

 // Warehouse receives only the read path; no create button or rendered cost.
 role='warehouse'; await page.reload({waitUntil:'networkidle0'});
 await page.waitForSelector('tbody tr');
 check(!(await page.$$eval('button',els=>els.some(el=>el.textContent.trim()==='Tạo đơn hàng'))),'warehouse no create');
 await clickText('EXISTING-001');
 await page.waitForSelector('[role="dialog"] li');
 check(!(await page.$eval('[role="dialog"]',el=>el.textContent.includes('Giá vốn'))),'warehouse cost hidden');
 await closeDetail();
 detailFail=true; await clickText('EXISTING-001');
 await page.waitForSelector('[role="alert"]');
 detailFail=false; await clickText('Thử lại');
 await page.waitForSelector('[role="dialog"] li');
 check(true,'detail error and retry');

 // Lifecycle commands: manager confirms; warehouse prepares/ships; dropped ship replays after reload.
 role='manager'; await page.reload({waitUntil:'networkidle0'}); await page.waitForSelector('tbody tr');
 await clickText(writes[0].orderNumber);
 await page.waitForSelector('[role="dialog"] ul li');
 await clickText('Xác nhận đơn');
 check(opWrites.length===0,'confirmation has no write until consent');
 await clickText('Đồng ý xác nhận đơn');
 await page.waitForFunction(()=>document.querySelector('[role="dialog"] dl dd')?.textContent==='Đã xác nhận');
 check(opWrites.at(-1).operation==='confirm','confirm endpoint');
 await closeDetail();
 role='warehouse'; await page.reload({waitUntil:'networkidle0'}); await page.waitForSelector('tbody tr');
 await clickText(writes[0].orderNumber); await page.waitForSelector('[role="dialog"] ul li');
 check(!(await page.$$eval('[role="dialog"] button',els=>els.some(el=>['Hủy đơn','Xác nhận đơn'].includes(el.textContent.trim())))),'warehouse cannot confirm/cancel');
 await clickText('Bắt đầu chuẩn bị'); await clickText('Đồng ý bắt đầu chuẩn bị');
 await page.waitForFunction(()=>document.querySelector('[role="dialog"] dl dd')?.textContent==='Đang chuẩn bị');
 dropShip=true;
 await clickText('Xuất kho'); await clickText('Đồng ý xuất kho');
 await page.waitForFunction(()=>document.body.innerText.includes('Chưa xác nhận được kết quả.'));
 const firstShip=opWrites.at(-1);
 check(firstShip.operation==='ship','ship endpoint');
 check(orders.find(o=>o.id==='created').status==='shipped','fixture committed before response drop');
 await closeDetail();
 await page.reload({waitUntil:'networkidle0'}); await page.waitForSelector('tbody tr');
 await clickText(writes[0].orderNumber); await page.waitForSelector('[role="dialog"] ul li');
 await clickText('Kiểm tra lại thao tác');
 await page.waitForFunction(()=>document.body.innerText.includes('đã xác nhận kết quả yêu cầu trước.'));
 await page.waitForFunction(()=>document.querySelectorAll('[aria-label="Lịch sử trạng thái"] ol li').length===3);
 check(JSON.stringify(firstShip)===JSON.stringify(opWrites.at(-1)),'same ship payload/key survives reload');
 check(history.get('created').filter(entry=>entry.toStatus==='shipped').length===1,'one ship event in fixture');
 check(!(await page.$$eval('[role="dialog"] button',els=>els.some(el=>el.textContent.trim()==='Xuất kho'))),'no new ship action after shipped');
 await closeDetail();

 // Cancel confirmation, required reason, conflict keeps draft, retry succeeds.
 orders.push({...original,id:'cancel-order',orderNumber:'CANCEL-001',status:'processing'});
 role='manager'; await page.reload({waitUntil:'networkidle0'}); await page.waitForSelector('tbody tr');
 await clickText('CANCEL-001'); await page.waitForSelector('[role="dialog"] ul li');
 await clickText('Hủy đơn');
 if(process.env.NEXUS_UI_SCREENSHOTS) {
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
  await page.screenshot({path:process.env.NEXUS_UI_SCREENSHOTS+'/orders-cancel-mobile.png',fullPage:true});
 }
 const beforeCancel=opWrites.length;
 await clickText('Đồng ý hủy đơn');
 check(opWrites.length===beforeCancel,'missing cancel reason prevents POST');
 await page.type('[aria-label="Thao tác đơn hàng"] textarea','Khách yêu cầu hủy');
 operationConflict=true;
 await clickText('Đồng ý hủy đơn');
 await page.waitForFunction(()=>document.body.innerText.includes('Trạng thái đơn đã thay đổi.'));
 check(await page.$eval('[aria-label="Thao tác đơn hàng"] textarea',el=>el.value)==='Khách yêu cầu hủy','conflict preserves reason');
 await clickText('Đồng ý hủy đơn');
 await page.waitForFunction(()=>document.querySelector('[role="dialog"] dl dd')?.textContent==='Đã hủy');
 check(opWrites.at(-1).body.reason==='Khách yêu cầu hủy','cancel sends reason');
 check(history.get('cancel-order').length===1,'one successful cancel event');
 check(await page.$$eval('[aria-label="Thao tác đơn hàng"] form',els=>els.length)===0,'no pending operation after cancel');
 await closeDetail();


 // Return request: no local stock mutation, quantity validation and exact replay after uncertain write.
 await clickText('EXISTING-001'); await page.waitForSelector('[role="dialog"] ul li');
 await clickText('Tạo yêu cầu trả hàng');
 await page.type('[aria-label="Lý do trả hàng"]','Sản phẩm lỗi');
 await clickText('Gửi yêu cầu trả hàng');
 await page.waitForFunction(()=>document.body.innerText.includes('ít nhất một sản phẩm'));
 check(returnWrites.length===0,'zero return quantity prevents POST');
 const quantity=await page.$('[aria-label="Số lượng trả Sản phẩm kiểm tra"]');
 await quantity.click({clickCount:3}); await page.keyboard.press('Backspace'); await quantity.type('1');
 if(process.env.NEXUS_UI_SCREENSHOTS) {
  await page.$eval('[aria-label="Trả hàng"]',el=>el.scrollIntoView({block:'start'}));
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})));});
  await page.screenshot({path:process.env.NEXUS_UI_SCREENSHOTS+'/orders-return-mobile.png',fullPage:true});
 }
 dropReturn=true;
 await clickText('Gửi yêu cầu trả hàng');
 await page.waitForFunction(()=>document.body.innerText.includes('Chưa xác nhận được kết quả trả hàng.'));
 check(returnWrites.length===1,'one initial return request');
 await closeDetail();
 await page.reload({waitUntil:'networkidle0'}); await page.waitForSelector('tbody tr');
 await clickText('EXISTING-001'); await page.waitForSelector('[role="dialog"] ul li');
 await clickText('Kiểm tra lại trả hàng');
 await page.waitForSelector('[aria-label="Kết quả trả hàng"]');
 const returnId=returnWrites[0].id;
 check(returnWrites.length===2 && JSON.stringify(returnWrites[0])===JSON.stringify(returnWrites[1]),'same return payload/id after reload');
 check(returnRows.size===1,'one fixture return');
 check(await page.$eval('[aria-label="Kết quả trả hàng"]',el=>el.textContent.includes('Đã yêu cầu')),'return status');
 await clickText('Tạo yêu cầu trả hàng'); await page.type('[aria-label="Lý do trả hàng"]','Thử trả thêm');
 const extra=await page.$('[aria-label="Số lượng trả Sản phẩm kiểm tra"]');
 await extra.click({clickCount:3});await page.keyboard.press('Backspace');await extra.type('1');
 await clickText('Gửi yêu cầu trả hàng');
 await page.waitForFunction(()=>document.body.innerText.includes('Số lượng trả vượt lượng còn lại.'));
 check(returnRows.size===1,'over-return rejection leaves original return');
 check(await page.$eval('[aria-label="Lý do trả hàng"]',el=>el.value)==='Thử trả thêm','return conflict preserves reason');
 await clickText('Đóng biểu mẫu');

 // Fee write whose response is lost is resolved with GET, without a second POST.
 await page.waitForSelector('[aria-label="Phí và lợi nhuận"] dl');
 await clickText('Thêm khoản phí'); await page.type('[aria-label="Số tiền phí"]','5000.01'); feeMode='uncertain';
 await clickText('Ghi nhận phí');
 await page.waitForFunction(()=>document.body.innerText.includes('Chưa rõ kết quả ghi phí.'));
 check(feeWrites.length===1,'one initial fee POST');
 await closeDetail(); await page.reload({waitUntil:'networkidle0'}); await page.waitForSelector('tbody tr');
 await clickText('EXISTING-001'); await page.waitForSelector('[role="dialog"] ul li');
 await clickText('Kiểm tra lại khoản phí');
 await page.waitForFunction(()=>document.body.innerText.includes('Đã xác nhận khoản phí được ghi nhận.'));
 await page.waitForSelector('[aria-label="Phí và lợi nhuận"] dl');
 check(feeWrites.length===1,'uncertain fee resolved by lookup, no repeated POST');
 check(await page.$eval('[aria-label="Phí và lợi nhuận"]',el=>el.textContent.includes('34.999,99')),'CM preserves fractional money');

 // Concurrent fee insert: POST 409 is reconciled against the exact same fee ID/content.
 await clickText('Thêm khoản phí');await page.select('[aria-label="Loại phí"]','ads');
 await page.type('[aria-label="Số tiền phí"]','20000');feeMode='concurrent';
 await clickText('Ghi nhận phí');
 await page.waitForFunction(()=>document.body.innerText.includes('Đã xác nhận khoản phí được ghi nhận.'));
 await page.waitForFunction(()=>document.querySelector('[aria-label="Phí và lợi nhuận"]')?.textContent.includes('14.999,99'));
 if(process.env.NEXUS_UI_SCREENSHOTS) {
  await page.$eval('[aria-label="Phí và lợi nhuận"]',el=>el.scrollIntoView({block:'start'}));
  await page.screenshot({path:process.env.NEXUS_UI_SCREENSHOTS+'/orders-finance-mobile.png',fullPage:true});
 }
 check(feeRows.length===2,'concurrent fee reconciliation does not add another fee');
 check(feeWrites.length===2,'one POST per new fee');
 await closeDetail();

 // Nullable contribution stays unknown; warehouse never requests finance.
 missingCost=true;
 await clickText('EXISTING-001');await page.waitForSelector('[aria-label="Phí và lợi nhuận"] dl');
 check(await page.$eval('[aria-label="Phí và lợi nhuận"]',el=>el.textContent.includes('Chưa có đủ giá vốn')),'missing COGS is explicit');
 check(await page.$$eval('[aria-label="Phí và lợi nhuận"] dd',els=>els.filter(el=>el.textContent==='Chưa đủ giá vốn').length)===4,'COGS and all CM remain unknown');
 await closeDetail();missingCost=false;
 role='warehouse';financeCalls=0;await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('tbody tr');
 await clickText('EXISTING-001');await page.waitForSelector('[role="dialog"] ul li');
 check(await page.$('[aria-label="Phí và lợi nhuận"]')===null,'warehouse finance hidden');
 check(!(await page.$$eval('button',els=>els.some(el=>el.textContent.trim()==='Tạo yêu cầu trả hàng'))),'warehouse return creation hidden');
 await page.type('[aria-label="Mã yêu cầu trả hàng"]',returnId);await clickText('Tra cứu trả hàng');
 await page.waitForSelector('[aria-label="Kết quả trả hàng"]');
 check(financeCalls===0,'warehouse sends no fees or CM request');
 check(await page.$eval('[aria-label="Kết quả trả hàng"]',(el,id)=>el.textContent.includes(id),returnId),'warehouse reads permitted return');
 await closeDetail();

 check(errors.length===0,errors.join('; '));
 console.log('PASS: '+assertions+' browser assertions; detail, create validation, uncertain-write replay, role, mobile, confirm/process/ship/cancel, history, returns, fees/CM and safe replay. HTTP fixtures only.');
} finally { await browser.close(); }
