import { launchUatBrowser } from './uat-browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.UAT_BASE_URL || 'http://127.0.0.1:5174';
const dir = process.env.UAT_OUTPUT_DIR || 'artifacts/mvp-smoke';
await fs.mkdir(dir, { recursive: true });

const browser = await launchUatBrowser({ headless: 'shell' });
const page = await browser.newPage();
const errors = [];
const trace = [];
async function checkpoint(name) {
  trace.push({ name, at: new Date().toISOString() });
  await fs.writeFile(`${dir}/trace.json`, JSON.stringify(trace, null, 2));
}
page.on('console', message => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', error => errors.push(String(error)));
await page.setViewport({ width: 1440, height: 1050 });

try {
  await checkpoint('browser-ready');
  await page.goto(`${base}/app`, { waitUntil: 'networkidle0' });
  await checkpoint('app-loaded');
  if (await page.$('#login-email')) {
    await page.locator('[data-demo-role="owner"]').click();
    await page.locator('button[type="submit"]').click();
  }

  await page.waitForFunction(() => document.querySelector('[data-testid="workspace"]')?.getAttribute('data-role') === 'owner');
  await checkpoint('owner-workspace');
  await page.waitForSelector('[data-nav="dashboard"]');
  const dashboardText = await page.$eval('main', element => element.textContent || '');
  assert.match(dashboardText, /Mật Độ Đơn Hàng Theo Ngày Và Khung Giờ/i);
  assert.match(dashboardText, /kênh đang kết nối/i);
  await page.screenshot({ path: `${dir}/dashboard.png`, fullPage: true });
  await checkpoint('dashboard-verified');

  await page.locator('[data-nav="simulator"]').click();
  await page.waitForFunction(() => document.querySelector('main')?.textContent?.includes('Webhook Flash Sale Simulator'));
  await checkpoint('simulator-loaded');
  await page.waitForSelector('main .btn-primary', { visible: true });
  await page.click('main .btn-primary');
  await checkpoint('simulator-clicked');
  await page.waitForFunction(() => document.querySelector('main')?.textContent?.includes('Chống bán lố thành công'), { timeout: 30000 });
  await checkpoint('simulator-finished');

  const simulatorText = await page.$eval('main', element => element.textContent || '');
  assert.match(simulatorText, /100\/100 webhook/i);
  assert.match(simulatorText, /x-nexus-signature/i);
  assert.match(simulatorText, /không âm kho/i);
  await page.screenshot({ path: `${dir}/simulator.png`, fullPage: true });
  await checkpoint('simulator-verified');

  await page.locator('[data-nav="fulfillment"]').click();
  await page.waitForFunction(() => document.querySelector('main')?.textContent?.includes('Hàng chờ Kho xử lý'));
  const fulfillmentText = await page.$eval('main', element => element.textContent || '');
  assert.match(fulfillmentText, /Chờ nhặt hàng/i);
  assert.doesNotMatch(fulfillmentText, /· allocated/i);
  assert.doesNotMatch(fulfillmentText, /FLASH-\d+-\d+\s*·\s*Chưa có SLA/i);
  await page.screenshot({ path: `${dir}/fulfillment-queue.png`, fullPage: true });
  await checkpoint('fulfillment-queue-verified');

  await page.locator('[data-nav="inventory"]').click();
  await page.waitForFunction(() => document.querySelector('main')?.textContent?.includes('Cấu phần tồn vật lý'));
  const inventoryText = await page.$eval('main', element => element.textContent || '');
  assert.match(inventoryText, /Hàng trên đường · không tính vào tồn vật lý/i);
  assert.doesNotMatch(inventoryText, /Pipeline/i);
  await page.screenshot({ path: `${dir}/inventory-groups.png`, fullPage: true });
  await checkpoint('inventory-groups-verified');

  await page.locator('[data-nav="cashWorkingCapital"]').click();
  await page.waitForFunction(() => document.querySelector('main')?.textContent?.includes('Dự Báo Dòng Tiền 14 Ngày'));
  const cashText = await page.$eval('main', element => element.textContent || '');
  assert.doesNotMatch(cashText, /Chứng từ mock|tài khoản mock/i);
  await page.screenshot({ path: `${dir}/cash-forecast.png`, fullPage: true });
  await checkpoint('cash-forecast-verified');

  await page.locator('[data-nav="channelConnections"]').click();
  await page.waitForFunction(() => document.querySelector('main')?.textContent?.includes('Kênh Bán & Kết Nối'));
  const connectionText = await page.$eval('main', element => element.textContent || '');
  assert.match(connectionText, /Thêm kết nối/i);
  assert.doesNotMatch(connectionText, /Them ket noi/i);
  await page.screenshot({ path: `${dir}/channel-connections.png`, fullPage: true });
  await checkpoint('channel-connections-verified');

  await page.locator('[data-nav="channelMapping"]').click();
  await page.waitForFunction(() => document.querySelector('main')?.textContent?.includes('Ánh Xạ SKU Theo Kênh'));
  const mappingText = await page.$eval('main', element => element.textContent || '');
  assert.match(mappingText, /SKU đã ánh xạ/i);
  assert.doesNotMatch(mappingText, /Add Mapping|All Channels|mapped SKUs|Internal Product/i);
  await page.screenshot({ path: `${dir}/channel-mapping.png`, fullPage: true });
  await checkpoint('channel-mapping-verified');

  const hasRootOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(hasRootOverflow, false);

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ status: 'PASS', dashboard: 'PASS', simulator: 'PASS', fulfillmentQueue: 'PASS', inventory: 'PASS', cash: 'PASS', connections: 'PASS', mapping: 'PASS', consoleErrors: 0 }));
} catch (error) {
  await page.screenshot({ path: `${dir}/failure.png`, fullPage: true }).catch(() => {});
  await fs.writeFile(`${dir}/failure.json`, JSON.stringify({ error: String(error), errors }, null, 2));
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.close();
}
