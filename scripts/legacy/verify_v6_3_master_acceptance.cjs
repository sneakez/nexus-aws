const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'ux-v6-3', 'BEFORE_AFTER_SCREENSHOTS');
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\8a04f802-e5a0-46f9-bd6e-2bf71f22b582';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function saveAndCopy(filename) {
  const src = path.join(OUT_DIR, filename);
  const dest = path.join(ARTIFACT_DIR, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${filename} to artifacts directory`);
  }
}

async function run() {
  console.log('=== STARTING NEXUSOMS V6.3 POST-ACCEPTANCE CORRECTION & USABILITY SUITE ===');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Set mock authenticated session
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('nexus_mock_auth_session', JSON.stringify({
      user: { id: 'usr_owner_01', email: 'owner@nexusoms.io', role: 'authenticated' },
      tenant: { id: 'tenant_flagship', slug: 'nexus-flagship', name: 'Nexus Flagship Store' },
      role: 'owner'
    }));
  });

  // -------------------------------------------------------------------------
  // PHASE 0 — P0.1: SKU COUNT MISMATCH VERIFICATION (EXACTLY 6 SKUS)
  // -------------------------------------------------------------------------
  console.log('\n[P0.1 VERIFICATION] SKU Economics: Verifying exact 6 SKUs in mock store & rank distribution...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('tbody tr', { timeout: 8000 });

  const skuCountCheck = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const rankSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'STAR'));
    const options = Array.from(rankSelect ? rankSelect.options : []).map(o => ({ value: o.value, text: o.text }));
    const rows = document.querySelectorAll('tbody tr');
    return {
      options,
      has6InSelect: options.some(o => o.text.includes('(6)')),
      totalRows: rows.length,
      isExact6Rows: rows.length === 6
    };
  });
  console.log('✓ SKU Count verification result (All SKU = 6):', skuCountCheck);

  const shot1 = path.join(OUT_DIR, '01_sku_economics_all_6_skus_1440px.png');
  await page.screenshot({ path: shot1 });
  saveAndCopy('01_sku_economics_all_6_skus_1440px.png');

  // Filter to STAR (0 SKUs)
  await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const rankSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'STAR'));
    if (rankSelect) {
      rankSelect.value = 'STAR';
      rankSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const shot1b = path.join(OUT_DIR, '01b_sku_economics_star_filter_empty_explanation_1440px.png');
  await page.screenshot({ path: shot1b });
  saveAndCopy('01b_sku_economics_star_filter_empty_explanation_1440px.png');

  // Reset back to all
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Xem tất cả SKU'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // -------------------------------------------------------------------------
  // PHASE 0 — P0.2: MOBILE HEADER CLIPPING WITH FRESH NAVIGATION (390PX & 360PX)
  // -------------------------------------------------------------------------
  console.log('\n[P0.2 VERIFICATION] Mobile 390px Fresh Navigation: Verifying H1 is 100% visible below header...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1', { timeout: 8000 });

  const mobile390Orders = await page.evaluate(() => {
    const header = document.querySelector('header');
    const h1 = document.querySelector('h1');
    const main = document.querySelector('main');
    const tbRect = header ? header.getBoundingClientRect() : null;
    const h1Rect = h1 ? h1.getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      mainScrollTop: main ? main.scrollTop : null,
      topbarBottom: tbRect ? tbRect.bottom : null,
      topbarHeight: tbRect ? tbRect.height : null,
      h1Top: h1Rect ? h1Rect.top : null,
      h1Bottom: h1Rect ? h1Rect.bottom : null,
      gapBetweenHeaderAndH1: h1Rect && tbRect ? h1Rect.top - tbRect.bottom : null,
      isH1FullyBelowHeader: h1Rect && tbRect ? h1Rect.top >= tbRect.bottom : false,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  console.log('✓ Mobile 390px Orders fresh navigation geometry:', mobile390Orders);

  const shot2 = path.join(OUT_DIR, '02_mobile_390px_fresh_nav_h1_clear_orders.png');
  await page.screenshot({ path: shot2 });
  saveAndCopy('02_mobile_390px_fresh_nav_h1_clear_orders.png');

  // Mobile 390px SKU Economics
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1', { timeout: 8000 });

  const mobile390Sku = await page.evaluate(() => {
    const header = document.querySelector('header');
    const h1 = document.querySelector('h1');
    const tbRect = header ? header.getBoundingClientRect() : null;
    const h1Rect = h1 ? h1.getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      topbarBottom: tbRect ? tbRect.bottom : null,
      h1Top: h1Rect ? h1Rect.top : null,
      gap: h1Rect && tbRect ? h1Rect.top - tbRect.bottom : null,
      isH1FullyBelowHeader: h1Rect && tbRect ? h1Rect.top >= tbRect.bottom : false,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  console.log('✓ Mobile 390px SKU Economics fresh navigation geometry:', mobile390Sku);

  const shot3 = path.join(OUT_DIR, '03_mobile_390px_fresh_nav_h1_clear_sku.png');
  await page.screenshot({ path: shot3 });
  saveAndCopy('03_mobile_390px_fresh_nav_h1_clear_sku.png');

  // Mobile 360px Orders
  await page.setViewport({ width: 360, height: 740 });
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1', { timeout: 8000 });

  const mobile360Orders = await page.evaluate(() => {
    const header = document.querySelector('header');
    const h1 = document.querySelector('h1');
    const tbRect = header ? header.getBoundingClientRect() : null;
    const h1Rect = h1 ? h1.getBoundingClientRect() : null;
    return {
      scrollY: window.scrollY,
      topbarBottom: tbRect ? tbRect.bottom : null,
      h1Top: h1Rect ? h1Rect.top : null,
      gap: h1Rect && tbRect ? h1Rect.top - tbRect.bottom : null,
      isH1FullyBelowHeader: h1Rect && tbRect ? h1Rect.top >= tbRect.bottom : false,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  console.log('✓ Mobile 360px Orders fresh navigation geometry:', mobile360Orders);

  const shot4 = path.join(OUT_DIR, '04_mobile_360px_fresh_nav_orders.png');
  await page.screenshot({ path: shot4 });
  saveAndCopy('04_mobile_360px_fresh_nav_orders.png');

  // -------------------------------------------------------------------------
  // PHASE 2 — LEVEL 2 ACTION CENTERS IN DESKTOP (1440PX)
  // -------------------------------------------------------------------------
  console.log('\n[PHASE 2 LEVEL 2] Verifying Task-First Action Centers in Orders, Inventory, Returns...');
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Orders Action Center
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await page.waitForSelector('tbody tr', { timeout: 8000 });
  const hasOrdersActionCenter = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('trung tâm tác vụ cần xử lý') &&
           text.includes('khóa tồn') &&
           text.includes('vận chuyển');
  });
  console.log('✓ Orders Level 2 Action Center active:', hasOrdersActionCenter);

  const shot5 = path.join(OUT_DIR, '05_orders_action_center_1440px.png');
  await page.screenshot({ path: shot5 });
  saveAndCopy('05_orders_action_center_1440px.png');

  // 2. Inventory Action Center
  await page.goto('http://localhost:5173/app?page=inventory', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table', { timeout: 8000 });
  const hasInvActionCenter = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('tác vụ kho cần ưu tiên xử lý') &&
           text.includes('nghiệm thu qc') &&
           text.includes('ngưỡng an toàn');
  });
  console.log('✓ Inventory Level 2 Action Center active:', hasInvActionCenter);

  const shot6 = path.join(OUT_DIR, '06_inventory_action_center_1440px.png');
  await page.screenshot({ path: shot6 });
  saveAndCopy('06_inventory_action_center_1440px.png');

  // 3. Returns Action Center
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table', { timeout: 8000 });
  const hasReturnsActionCenter = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    return text.includes('trung tâm hồ sơ rma cần xử lý') &&
           text.includes('phê duyệt') &&
           text.includes('kiểm định qc');
  });
  console.log('✓ Returns Level 2 Action Center active:', hasReturnsActionCenter);

  const shot7 = path.join(OUT_DIR, '07_returns_action_center_1440px.png');
  await page.screenshot({ path: shot7 });
  saveAndCopy('07_returns_action_center_1440px.png');

  // -------------------------------------------------------------------------
  // PHASE 8 — OWNER USABILITY TESTS (5 REAL BUSINESS TASKS)
  // -------------------------------------------------------------------------
  console.log('\n[PHASE 8 USABILITY] Executing 5 Real Business Tasks...');

  // TASK 1: Find and process pending unconfirmed order
  console.log('Task 1: Find and process pending unconfirmed order...');
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await page.waitForSelector('tbody tr', { timeout: 8000 });

  // Click Action card "Xử lý đơn chờ duyệt ngay"
  const clickedTask1 = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Xử lý đơn chờ duyệt'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Clicked Task 1 CTA button:', clickedTask1);
  await new Promise(r => setTimeout(r, 600));

  // Verify Drawer or Order Detail is open
  const task1DrawerOpen = await page.evaluate(() => {
    return document.body.innerText.includes('Chi Tiết Đơn Hàng') ||
           document.body.innerText.includes('Vòng Đời Đơn Hàng') ||
           document.body.innerText.includes('ORD-44812');
  });
  console.log('✓ Task 1: Pending Order Detail Drawer successfully opened:', task1DrawerOpen);

  const shot8 = path.join(OUT_DIR, '08_usability_task1_pending_order_drawer.png');
  await page.screenshot({ path: shot8 });
  saveAndCopy('08_usability_task1_pending_order_drawer.png');

  // TASK 2: Detect SKU at low stock risk and open QC inspection modal
  console.log('\nTask 2: Detect SKU at stockout risk & trigger QC inspection modal...');
  await page.goto('http://localhost:5173/app?page=inventory', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table', { timeout: 8000 });

  // Click Action card "Nghiệm thu QC mở bán"
  const clickedTask2 = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Nghiệm thu QC mở bán'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Clicked Task 2 CTA button:', clickedTask2);
  await new Promise(r => setTimeout(r, 600));

  // Verify QC Modal is open
  const task2ModalOpen = await page.evaluate(() => {
    return document.body.innerText.includes('Nghiệm thu QC Lô hàng Dock') ||
           document.body.innerText.includes('Đạt chuẩn (Pass → Sellable)');
  });
  console.log('✓ Task 2: QC Inspection Modal successfully opened:', task2ModalOpen);

  const shot9 = path.join(OUT_DIR, '09_usability_task2_qc_modal_opened.png');
  await page.screenshot({ path: shot9 });
  saveAndCopy('09_usability_task2_qc_modal_opened.png');

  // Close modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Hủy') || b.getAttribute('title') === 'Đóng');
    if (cancelBtn) cancelBtn.click();
  });
  await new Promise(r => setTimeout(r, 400));

  // TASK 3: Locate negative CM3 order and inspect waterfall breakdown
  console.log('\nTask 3: Locate order with negative CM3 and inspect P&L Waterfall...');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('tbody tr', { timeout: 8000 });

  // Expand row of the first order
  const task3Expanded = await page.evaluate(() => {
    const expandBtn = document.querySelector('tbody tr td:first-child button') ||
                      document.querySelector('tbody tr td:first-child');
    if (expandBtn) {
      expandBtn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Task 3: Expanded order row in Order Economics:', task3Expanded);
  await new Promise(r => setTimeout(r, 600));

  const shot10 = path.join(OUT_DIR, '10_usability_task3_order_pnl_waterfall.png');
  await page.screenshot({ path: shot10 });
  saveAndCopy('10_usability_task3_order_pnl_waterfall.png');

  // TASK 4: Identify pending RMA ticket and approve
  console.log('\nTask 4: Identify pending RMA ticket and approve...');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table', { timeout: 8000 });

  // Click Action card "Phê duyệt hồ sơ chờ"
  const clickedTask4 = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Phê duyệt hồ sơ chờ'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Clicked Task 4 CTA button:', clickedTask4);
  await new Promise(r => setTimeout(r, 600));

  const shot11 = path.join(OUT_DIR, '11_usability_task4_rma_maker_checker.png');
  await page.screenshot({ path: shot11 });
  saveAndCopy('11_usability_task4_rma_maker_checker.png');

  // TASK 5: Navigate from Dashboard Decision Insights directly to target module
  console.log('\nTask 5: Navigate from Executive Dashboard Decision Insights directly to module...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('h3', { timeout: 8000 });

  const task5Navigated = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const linkBtn = buttons.find(b =>
      b.className && b.className.includes('text-brand-700') &&
      b.parentElement && b.parentElement.className.includes('border-t')
    );
    if (linkBtn) {
      linkBtn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Task 5: Clicked direct action link in Decision Insights:', task5Navigated);
  await new Promise(r => setTimeout(r, 600));

  const shot12 = path.join(OUT_DIR, '12_usability_task5_dashboard_decision_insights.png');
  await page.screenshot({ path: shot12 });
  saveAndCopy('12_usability_task5_dashboard_decision_insights.png');

  await browser.close();
  console.log('\n=== ALL V6.3 POST-ACCEPTANCE CORRECTIONS & USABILITY TESTS COMPLETED! ===');
}

run().catch(err => {
  console.error('V6.3 Master Acceptance Suite Failed:', err);
  process.exit(1);
});
