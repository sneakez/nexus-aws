import { launchUatBrowser } from './uat-browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const dir = process.env.UAT_OUTPUT_DIR || 'artifacts/ocean-restore';
await fs.mkdir(`${dir}/menus`, { recursive: true });
const browser = await launchUatBrowser();
const page = await browser.newPage();
await page.setViewport({ width: 1600, height: 1000 });
const report = { head: execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8' }).trim(), workingTree: true, startedAt: new Date().toISOString(), pages: [], roles: [], errors: [] };
page.on('pageerror', e => report.errors.push(String(e)));
const roleLabels = { owner:'👑 Chủ Doanh Nghiệp (Owner)', admin:'⚡ Admin Quản Trị', manager:'📊 Trưởng Phòng OMS', warehouse:'📦 Nhân Viên Kho', growth:'🚀 Tăng Trưởng & Ads' };
const ready = async () => { await page.waitForSelector('[data-testid="workspace"]'); await page.waitForNetworkIdle({ idleTime: 250 }); };
try {
  await page.goto('http://127.0.0.1:5174/app'); await ready();
  for (const role of ['owner','admin','manager','warehouse','growth']) {
    if (role !== 'owner') {
      await page.click('button[title="Nhấn để chuyển đổi vai trò (Role Switcher)"]');
      await page.click(`xpath/.//button[.//p[normalize-space(.)='${roleLabels[role]}']]`);
      await page.waitForFunction(role => document.querySelector('[data-testid="workspace"]')?.getAttribute('data-role') === role, {}, role);
    }
    const menu = await page.$$eval('button[data-nav]', buttons => buttons.map(b => ({ id:b.dataset.nav, label:b.innerText })));
    assert.ok(menu.length > 0, `${role}: menu exists`);
    report.roles.push({ role, menu });
    for (const { id, label } of menu) {
      await page.locator(`button[data-nav="${id}"]`).click();
      await page.waitForSelector(`main[data-page="${id}"]`); await ready();
      const body = await page.$eval('main', e => e.innerText);
      if (id === 'dashboard' && ['admin','warehouse'].includes(role)) assert.doesNotMatch(body, /Owner Decision Center|Bóc Tách Dòng Lợi Nhuận/i, `${role}: no executive financial dashboard`);
      const failure = /Trang bi loi|Không có quyền truy cập trang này/.test(body);
      const wrongReplacement = id !== 'workQueue' && Boolean(await page.$('[data-testid="handoff-list"]'));
      const entry = { role, route:id, label, status:failure || wrongReplacement || !body.trim() ? 'FAIL':'PASS', text:body.slice(0,1400) };
      report.pages.push(entry);
      if (role === 'owner' || entry.status === 'FAIL') await page.screenshot({ path:`${dir}/menus/${role}-${id}.png`, fullPage:true });
      // Reload after an error boundary so one broken page cannot mask later route checks.
      if (failure) { await page.reload(); await ready(); }
    }
  }
  report.status = report.pages.every(p => p.status === 'PASS') && !report.errors.length ? 'PASS':'FAIL';
} catch (e) { report.status='FAIL';report.failure=String(e); await page.screenshot({path:`${dir}/menu-failure.png`,fullPage:true}).catch(()=>{}); }
finally { report.finishedAt=new Date().toISOString(); await fs.writeFile(`${dir}/menu-results.json`,JSON.stringify(report,null,2)); await browser.close(); }
console.log(JSON.stringify({status:report.status,pages:report.pages.length,failed:report.pages.filter(p=>p.status==='FAIL').map(p=>`${p.role}:${p.route}`),errors:report.errors}));
if(report.status!=='PASS') process.exitCode=1;
