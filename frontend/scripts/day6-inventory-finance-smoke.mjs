import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const origin = process.env.UAT_BASE_URL || 'http://localhost:5175';
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const fees = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    const headers = {
      'access-control-allow-origin': origin,
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,POST',
    };
    const respond = (data, status = 200) => request.respond({ status, headers, contentType: 'application/json', body: JSON.stringify(data) });
    if (url.pathname === '/src/main.tsx') return void request.respond({
      status: 200, contentType: 'application/javascript',
      body: "import React from '/node_modules/.vite/deps/react.js';import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';import {BackendWorkspacePage} from '/src/app/BackendWorkspacePage.tsx';import {BackendOrderFinance} from '/src/features/orders/components/BackendOrderFinance.tsx';import '/src/index.css';ReactDOM.createRoot(document.getElementById('root')).render(location.search.includes('finance')?React.createElement(BackendOrderFinance,{orderId:'order'}):React.createElement(BackendWorkspacePage,{page:'inventory',search:''}));",
    });
    if (url.pathname.endsWith('/LiveAuthProvider.tsx')) return void request.respond({
      status: 200, contentType: 'application/javascript',
      body: "export const useAuth=()=>({session:{access_token:'fixture',user:{id:'manager'}},activeRole:'manager'});",
    });
    if (url.pathname.startsWith('/api/')) {
      if (request.method() === 'OPTIONS') return void request.respond({ status: 204, headers });
      if (url.pathname === '/api/v1/inventory') return void respond([{
        id: 'stock', warehouseCode: 'THINH-E2E-WH', productSku: 'THINH-E2E-TSHIRT',
        productName: 'Áo thun demo Thịnh', stock: 20, reserved: 2, available: 18, incoming: 0, pendingQc: 0,
      }]);
      if (url.pathname.endsWith('/fees')) {
        if (request.method() === 'POST') {
          const fee = { ...JSON.parse(request.postData()), orderId: 'order' };
          fees.push(fee);
          return void respond(fee, 201);
        }
        return void respond(fees);
      }
      if (url.pathname.endsWith('/contribution')) {
        const operating = fees.filter(fee => fee.feeType !== 'ads').reduce((sum, fee) => sum + fee.amount, 0);
        const ads = fees.filter(fee => fee.feeType === 'ads').reduce((sum, fee) => sum + fee.amount, 0);
        return void respond({
          orderId: 'order', revenue: 229999.98, costOfGoods: 120000,
          operatingFees: operating, advertisingFees: ads,
          cm1: 109999.98, cm2: (10999998 - operating * 100) / 100,
          cm3: (10999998 - operating * 100 - ads * 100) / 100, hasCompleteCost: true,
        });
      }
      return void respond([]);
    }
    void request.continue();
  });
  for (const width of [1280, 390]) {
    await page.setViewport({ width, height: 900 });
    await page.goto(origin, { waitUntil: 'networkidle0' });
    await page.waitForSelector('tbody tr');
    if (width === 390) {
      const stock = await page.$eval('[aria-label="Thông tin bản ghi"]', card =>
        Object.fromEntries([...card.querySelectorAll('dt')].map(label => [label.textContent, label.nextElementSibling.textContent])));
      assert.equal(stock['Tồn thực tế'], '20');
      assert.equal(stock['Đang giữ'], '2');
      assert.equal(stock['Khả dụng'], '18');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  }
  await page.goto(origin + '?finance', { waitUntil: 'networkidle0' });
  await page.waitForSelector('[aria-label="Phí và lợi nhuận"] dl');
  assert(await page.$eval('dl', list => list.textContent.includes('109.999,98')));
  async function addFee(type, amount) {
    await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent === 'Thêm khoản phí').click());
    await page.select('[aria-label="Loại phí"]', type);
    await page.type('[aria-label="Số tiền phí"]', amount);
    await page.click('button[type=submit]');
  }
  await addFee('commission', '10000');
  await page.waitForFunction(() => document.querySelector('dl')?.textContent.includes('99.999,98'));
  await addFee('ads', '20000');
  await page.waitForFunction(() => document.querySelector('dl')?.textContent.includes('79.999,98'));
  assert.equal(fees.length, 2);
  assert.deepEqual(errors, []);
  console.log('PASS: mobile stock 20/held 2/available 18; fractional order and two fee saves update CM2/CM3; HTTP fixtures.');
} finally {
  await browser.close();
}
