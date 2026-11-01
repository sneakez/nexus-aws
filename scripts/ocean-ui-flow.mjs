import { launchUatBrowser } from './uat-browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=process.env.UAT_OUTPUT_DIR || 'artifacts/ocean-restore/flow'; await fs.mkdir(dir,{recursive:true});
const browser=await launchUatBrowser(); const page=await browser.newPage(); await page.setViewport({width:1600,height:1000});
const report={startedAt:new Date().toISOString(),steps:[],errors:[]}; page.on('pageerror',e=>report.errors.push(String(e)));page.on('dialog',d=>d.accept());
const snap=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nexus_mock_db_v2')));
const ready=async()=>{await page.waitForSelector('[data-testid="workspace"]');await page.waitForFunction(()=>{const text=document.querySelector('main')?.innerText.trim();return Boolean(text)&&! /^(Đang tải|Loading)/i.test(text);});};
const click=async text=>{report.lastAction=`button:${text}`;const selector=`xpath/.//button[normalize-space(.)='${text}']`;await page.waitForSelector(selector);await page.focus(selector);await page.keyboard.press('Space');};
const input=async(label,value)=>{report.lastAction=`input:${label}`;await page.locator(`[aria-label="${label}"]`).fill(String(value));};
const go=async(route,extra='')=>{report.lastAction=`route:${route}${extra}`;await page.goto(`http://127.0.0.1:5174/app?page=${route}${extra}`,{waitUntil:'domcontentloaded'});await ready();};
const labels={owner:'👑 Chủ Doanh Nghiệp (Owner)',admin:'⚡ Admin Quản Trị',manager:'📊 Trưởng Phòng OMS',warehouse:'📦 Nhân Viên Kho',growth:'🚀 Tăng Trưởng & Ads'};
const role=async r=>{await go('dashboard');await page.locator('button[title="Nhấn để chuyển đổi vai trò (Role Switcher)"]').click();await page.locator(`xpath/.//button[.//p[normalize-space(.)='${labels[r]}']]`).click();await page.waitForFunction(r=>document.querySelector('[data-testid="workspace"]')?.getAttribute('data-role')===r,{},r);};
const order=async id=>{await go('orders',`&order=${id}`);await page.waitForSelector('[data-testid="order-actions"]');};
const source=async()=>{const selector='xpath/.//summary[normalize-space(.)="Kết quả sàn mô phỏng & giao dịch tiền"]';await page.waitForSelector(selector,{visible:true});if(!await page.$eval(selector,e=>e.parentElement.open)){await page.focus(selector);await page.keyboard.press('Space');}await page.waitForSelector('[aria-label="Số tiền nguồn"]',{visible:true});};
const stock=async(name,expected)=>{const s=await snap();const i=s.inventory5State[0];const actual=[i.physical,i.reserved,i.pending_qc,i.available];assert.deepEqual(actual,expected,name);report.steps.push({name,expected,actual,status:'PASS'});await page.screenshot({path:`${dir}/${report.steps.length}.png`,fullPage:true});};
try {
 await go('simulator');await click('Nạp fixture RAM-X');await stock('Owner loads fixture from original Simulator',[10,0,0,10]);
 await role('admin');await go('syncMonitor');
 for(const n of ['A','B','C']){const row=`[data-source-event="acceptance-event-${n}"]`;await page.waitForSelector(row);
  if(n==='A'){await page.locator(`${row} button.btn-secondary`).click();}
  await page.locator(`${row} button.btn-primary`).click();await page.waitForFunction(id=>JSON.parse(localStorage.getItem('nexus_mock_db_v2')).marketplaceEvents.find(e=>e.id===id)?.status==='processed',{},`acceptance-event-${n}`);}
 assert.equal((await snap()).orders.length,3);await role('manager');
 for(const n of ['A','B','C']){await order(`acceptance-${n}`);await click('Giữ tồn & giao kho');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nexus_mock_db_v2')).orders.filter(o=>o.status==='pending'&&!o.fulfillment_status).length===0 || Boolean(document.querySelector('[aria-label="Phân công kho"]')));}
 await page.waitForSelector('[aria-label="Phân công kho"]');await page.select('[aria-label="Phân công kho"]','usr_warehouse_01');await stock('Orders drawer reserves and assigns Warehouse',[10,3,0,7]);
 await role('warehouse');
 for(const n of ['A','B','C']){await go('fulfillment',`&order=acceptance-${n}`);await page.waitForSelector('[data-testid="order-actions"]');await input('SKU hoặc serial','RAM-X');await click('Kiểm SKU & nhặt hàng');await click('Đóng gói · chi phí demo 20.000 ₫');if(n!=='B'){await input('Mã vận đơn',`TRACK-${n}`);await click('Xác nhận kho bàn giao');}}
 await stock('Original Fulfillment hands over A/C, B remains packed',[8,1,0,7]);
 await role('manager');await order('acceptance-B');await click('Ghi nhận yêu cầu hủy');
 await role('warehouse');await go('fulfillment','&order=acceptance-B');await page.waitForSelector('[data-testid="order-actions"]');assert.match(await page.$eval('[data-testid="order-actions"]',e=>e.innerText),/dừng xử lý/);
 await role('manager');await order('acceptance-B');await input('Lý do vận hành','Nguồn từ chối hủy, tiếp tục kho');await click('Sàn từ chối hủy');assert.equal((await snap()).orders.find(o=>o.id==='acceptance-B').cancellation_requested,false);
 await input('Lý do vận hành','Nguồn xác nhận hủy đơn packed');await click('Sàn demo xác nhận hủy');await stock('Packed cancellation releases reservation exactly once',[8,0,0,8]);
 await order('acceptance-A');await source();await click('Sàn báo giao thành công');
 await order('acceptance-C');await source();await click('Sàn báo giao thất bại');await stock('Source failure does not restock',[8,0,0,8]);
 await role('warehouse');await go('returns','&return=return-acceptance-C');await page.waitForSelector('[data-testid="return-actions"]');await input('Nhận return-item-acceptance-item-C',1);await click('Lưu thực nhận');await stock('Original Returns drawer records physical receipt pending QC',[9,0,1,8]);
 await page.reload();await ready();await page.waitForSelector('[data-testid="return-actions"]');await input('Đạt return-item-acceptance-item-C',1);await click('Lưu kết quả QC');await stock('QC after reload releases one sellable unit',[9,0,0,9]);
 await role('manager');
 for(const [n,fee]of [['A',100000],['B',0],['C',60000]]){await order(`acceptance-${n}`);await source();await input('Số tiền nguồn',fee);await click('Nhận phí nguồn');}
 await go('feeReconciliation');for(const n of ['A','B','C']){await page.locator(`[data-fee="fee-acceptance-${n}"]`).click();await click('Xác Nhận & Lưu Bền Vững');}
 await role('growth');await go('marketingAnalytics');assert.match(await page.$eval('main',e=>e.innerText),/-120\.000/);await page.locator('[data-recommend-order="acceptance-A"]').click();await page.screenshot({path:`${dir}/growth-before-credit.png`,fullPage:true});
 await role('manager');await go('marketingAnalytics');await click('Tiếp nhận đề xuất');await order('acceptance-C');await source();await input('Số tiền nguồn',40000);await click('Nhận credit Ads');
 await role('growth');await go('marketingAnalytics');assert.match(await page.$eval('main',e=>e.innerText),/-80\.000/);await page.reload();await ready();assert.match(await page.$eval('main',e=>e.innerText),/-80\.000/);report.steps.push({name:'Original Growth report reflects reconciliation and late Ads credit; Manager accepts proposal',status:'PASS'});
 await role('warehouse');await go('feeReconciliation');assert.match(await page.$eval('[role="alert"]',e=>e.innerText),/Không có quyền/);report.steps.push({name:'Warehouse finance deep link denied',status:'PASS'});
 await go('workQueue');assert.equal(await page.$$eval('[data-testid="handoff-list"] button',els=>els.length),0);report.steps.push({name:'Handoff list contains links and no mutation controls',status:'PASS'});
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e);await page.screenshot({path:`${dir}/failure.png`,fullPage:true}).catch(()=>{});throw e;}
finally{report.finishedAt=new Date().toISOString();await fs.writeFile(`${dir}/results.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify({status:report.status,steps:report.steps.length}));
