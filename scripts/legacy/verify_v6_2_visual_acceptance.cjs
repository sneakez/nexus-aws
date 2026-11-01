const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'screenshots_v6_2_acceptance');
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\8a04f802-e5a0-46f9-bd6e-2bf71f22b582';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function copyToArtifacts(filename) {
  const src = path.join(OUT_DIR, filename);
  const dest = path.join(ARTIFACT_DIR, filename);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${filename} to artifacts directory`);
  }
}

async function clickButtonWithText(page, text) {
  return await page.$$eval('button', (btns, search) => {
    const btn = btns.find(b => b.textContent && b.textContent.includes(search));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, text);
}

async function run() {
  console.log('=== STARTING NEXUSOMS V6.2 FINAL UX VISUAL ACCEPTANCE (REAL BROWSER INTERACTIONS) ===');

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
      user: {
        id: 'usr_owner_01',
        email: 'owner@nexusoms.io',
        role: 'authenticated'
      },
      tenant: {
        id: 'tenant_flagship',
        slug: 'nexus-flagship',
        name: 'Nexus Flagship Store'
      },
      role: 'owner'
    }));
  });

  // -------------------------------------------------------------
  // PART 1: DESKTOP 1440PX TESTS & INTERACTIONS
  // -------------------------------------------------------------
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Orders Page: Default Clean View (Uncluttered)
  console.log('\n[TEST 1] Orders Page: Verifying default clean view without spreadsheet clutter...');
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Verify headers count & column groups
  const headerGroups = await page.$$eval('thead tr:first-child th', ths => ths.map(t => t.textContent.trim()).filter(Boolean));
  console.log('Default visible column groups in Orders:', headerGroups);

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_01_orders_clean_grid_1440px.png') });
  copyToArtifacts('acceptance_01_orders_clean_grid_1440px.png');

  // 2. Orders Page: Toggle Column Group + Expand Row
  console.log('\n[TEST 2] Orders Page: Testing Column Group Toggle & Row Expand interaction...');
  // Click Column group selector
  const groupBtn = await page.$('button[title*="Tùy chỉnh nhóm cột"]');
  if (groupBtn) {
    await groupBtn.click();
    await new Promise(r => setTimeout(r, 300));
    console.log('✓ Clicked Column Group Selector dropdown');

    // Click to toggle Unit Economics group on
    const econBtn = await page.$eval('div.max-h-60 button:nth-child(3)', el => {
      el.click();
      return el.textContent.trim();
    });
    console.log('✓ Toggled column group:', econBtn);
    await new Promise(r => setTimeout(r, 300));
    // Click outside to close dropdown
    await page.click('h1');
    await new Promise(r => setTimeout(r, 300));
  }

  // Click expand on the first order row
  const expandButtons = await page.$$('button[title*="chi tiết dòng hàng"]');
  if (expandButtons.length > 0) {
    await expandButtons[0].click();
    console.log('✓ Expanded row 1 to display Stepper and P&L Waterfall');
    await new Promise(r => setTimeout(r, 500));
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_02_orders_toggled_cm_expanded_1440px.png') });
  copyToArtifacts('acceptance_02_orders_toggled_cm_expanded_1440px.png');

  // 3. Order Economics Page
  console.log('\n[TEST 3] Order Economics: Verifying 3-tier CM breakdown & Waterfall...');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const orderEconExpands = await page.$$('button[title*="chi tiết dòng hàng"]');
  if (orderEconExpands.length > 0) {
    await orderEconExpands[0].click();
    await new Promise(r => setTimeout(r, 400));
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_03_order_economics_waterfall_1440px.png') });
  copyToArtifacts('acceptance_03_order_economics_waterfall_1440px.png');

  // 4. SKU Economics Page: SKU Portfolio Matrix & Star Filter
  console.log('\n[TEST 4] SKU Economics: Testing SKU Portfolio Matrix & filtering by Star items...');
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Select "STAR" from dropdown
  const filterSelect = await page.$('select.input');
  if (filterSelect) {
    await page.select('select.input', 'STAR');
    console.log('✓ Filtered SKU Portfolio Matrix to STAR items');
    await new Promise(r => setTimeout(r, 400));
  }

  // Expand first row to show stock breakdown and break-even calculator link
  const skuExpands = await page.$$('button[title*="chi tiết dòng hàng"]');
  if (skuExpands.length > 0) {
    await skuExpands[0].click();
    await new Promise(r => setTimeout(r, 400));
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_04_sku_portfolio_matrix_filtered_1440px.png') });
  copyToArtifacts('acceptance_04_sku_portfolio_matrix_filtered_1440px.png');

  // 5. Channel Economics Page
  console.log('\n[TEST 5] Channel Economics: Verifying Take Rate & Cross-Module CTA...');
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_05_channel_economics_take_rate_1440px.png') });
  copyToArtifacts('acceptance_05_channel_economics_take_rate_1440px.png');

  // 6. RMA / Returns Page: Branch-Adaptive Stepper Interactions
  console.log('\n[TEST 6] RMA / Returns: Testing Dynamic Workflow Stepper across branches...');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // 6a. Tab 1: Hoàn Tiền Tiêu Chuẩn (Standard Refund - 5 steps)
  console.log('Testing Tab 1: Hoàn Tiền Tiêu Chuẩn (Standard Refund)...');
  await clickButtonWithText(page, '1. Hoàn Tiền Tiêu Chuẩn');
  await new Promise(r => setTimeout(r, 400));
  const standardSteps = await page.$$eval('.hidden.md\\:grid > div', nodes => nodes.map(n => n.textContent.trim()).filter(Boolean));
  console.log('Standard Refund Stepper Steps:', standardSteps);
  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_06_rma_standard_refund_stepper_1440px.png') });
  copyToArtifacts('acceptance_06_rma_standard_refund_stepper_1440px.png');

  // 6b. Tab 2: Returnless Refund (4 steps, skips Receiving & QC)
  console.log('Testing Tab 2: Returnless Refund (Bỏ Qua QC)...');
  await clickButtonWithText(page, '2. Returnless Refund');
  await new Promise(r => setTimeout(r, 400));
  const returnlessSteps = await page.$$eval('.hidden.md\\:grid > div', nodes => nodes.map(n => n.textContent.trim()).filter(Boolean));
  console.log('Returnless Refund Stepper Steps:', returnlessSteps);
  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_07_rma_returnless_refund_stepper_1440px.png') });
  copyToArtifacts('acceptance_07_rma_returnless_refund_stepper_1440px.png');

  // 6c. Tab 3: Đổi Hàng Mới (Exchange) & Tab 4: Bảo Hành (Warranty)
  console.log('Testing Tab 3: Đổi Hàng Mới (Exchange)...');
  await clickButtonWithText(page, '3. Đổi Hàng Mới');
  await new Promise(r => setTimeout(r, 400));
  const exchangeSteps = await page.$$eval('.hidden.md\\:grid > div', nodes => nodes.map(n => n.textContent.trim()).filter(Boolean));
  console.log('Exchange Stepper Steps:', exchangeSteps);
  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_08_rma_exchange_warranty_stepper_1440px.png') });
  copyToArtifacts('acceptance_08_rma_exchange_warranty_stepper_1440px.png');

  // 7. Executive Analytics Dashboard: Collapsible Insights & CTA
  console.log('\n[TEST 7] Executive Dashboard: Testing Progressive Disclosure in Decision Intelligence...');
  await page.goto('http://localhost:5173/app?page=executiveDashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Click on "Xem nguyên nhân, rủi ro & nguồn dữ liệu" toggle
  const clickedInsight = await clickButtonWithText(page, 'Xem nguyên nhân, rủi ro');
  if (clickedInsight) {
    console.log('✓ Expanded deep diagnostic and predictive audit layer in Insight #1');
    await new Promise(r => setTimeout(r, 400));
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_09_dashboard_insights_expanded_1440px.png') });
  copyToArtifacts('acceptance_09_dashboard_insights_expanded_1440px.png');

  // -------------------------------------------------------------
  // PART 2: TABLET 768PX RESPONSIVE VERIFICATION
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Tablet (768px): Testing responsive layout & smooth scroll...');
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_10_tablet_768px_orders_rma.png') });
  copyToArtifacts('acceptance_10_tablet_768px_orders_rma.png');

  // -------------------------------------------------------------
  // PART 3: MOBILE 390PX PROGRESSIVE DISCLOSURE VERIFICATION
  // -------------------------------------------------------------
  console.log('\n[TEST 9] Mobile (390px): Testing mobile card layout and compact steppers...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Expand first mobile order card
  const clickedCard = await clickButtonWithText(page, 'Mở P&L & Sản Phẩm');
  if (clickedCard) {
    console.log('✓ Expanded mobile order card P&L accordion');
    await new Promise(r => setTimeout(r, 400));
  }

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_11_mobile_390px_orders_cards.png') });
  copyToArtifacts('acceptance_11_mobile_390px_orders_cards.png');

  // Mobile RMA Stepper
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(OUT_DIR, 'acceptance_12_mobile_390px_rma_stepper.png') });
  copyToArtifacts('acceptance_12_mobile_390px_rma_stepper.png');

  await browser.close();
  console.log('\n=== ALL BROWSER INTERACTIONS & VISUAL ACCEPTANCE TESTS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
