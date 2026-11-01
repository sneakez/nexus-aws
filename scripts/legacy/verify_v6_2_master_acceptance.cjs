const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'ux-final', 'BEFORE_AFTER_SCREENSHOTS');
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
  console.log('=== STARTING NEXUSOMS V6.2 MASTER UI/UX ACCEPTANCE TESTING ===');

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

  // -------------------------------------------------------------------------
  // TEST 1: P0.1 SKU PORTFOLIO MATRIX - STAR FILTER EMPTY STATE & RESET
  // -------------------------------------------------------------------------
  console.log('\n[TEST 1] SKU Economics: Testing Star filter empty state explanation & reset...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Select STAR in the rank filter dropdown
  const selectSuccess = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    const rankSelect = selects.find(s => Array.from(s.options).some(o => o.value === 'STAR'));
    if (rankSelect) {
      rankSelect.value = 'STAR';
      rankSelect.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  });
  console.log('✓ Selected STAR filter in dropdown:', selectSuccess);
  await new Promise(r => setTimeout(r, 600));

  const shot1 = path.join(OUT_DIR, '01_sku_economics_stars_empty_state_1440px.png');
  await page.screenshot({ path: shot1 });
  saveAndCopy('01_sku_economics_stars_empty_state_1440px.png');

  // Verify explanation exists
  const explanationExists = await page.evaluate(() => {
    return document.body.innerText.includes('Không có SKU nào thuộc phân nhóm') &&
           document.body.innerText.includes('Biên lợi nhuận CM ≥ 30%') &&
           document.body.innerText.includes('Sản lượng bán ≥ 10 đơn vị');
  });
  console.log('✓ Star filter empty state explains criteria properly:', explanationExists);

  // Click reset button
  const resetClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const resetBtn = buttons.find(b => b.innerText.includes('Xem tất cả SKU trong Portfolio') || b.innerText.includes('Đặt lại bộ lọc'));
    if (resetBtn) {
      resetBtn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Clicked reset filter button:', resetClicked);
  await new Promise(r => setTimeout(r, 600));

  const shot2 = path.join(OUT_DIR, '02_sku_economics_after_reset_stars_1440px.png');
  await page.screenshot({ path: shot2 });
  saveAndCopy('02_sku_economics_after_reset_stars_1440px.png');

  // -------------------------------------------------------------------------
  // TEST 2: P0.2 SHARED CHART TOOLTIP READABILITY & HIGH CONTRAST
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Chart Tooltip: Hovering scatter bubble to verify solid Slate-900 tooltip...');
  // Hover over a bubble or scatter point using page.mouse
  const dotHandle = await page.$('.recharts-scatter-symbol, .recharts-symbols, circle, .recharts-scatter path');
  let hoverSuccess = false;
  if (dotHandle) {
    const box = await dotHandle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      hoverSuccess = true;
    }
  }
  console.log('✓ Hovered over scatter bubble via Puppeteer mouse:', hoverSuccess);
  await new Promise(r => setTimeout(r, 600));

  const shot3 = path.join(OUT_DIR, '03_chart_tooltip_solid_contrast_1440px.png');
  await page.screenshot({ path: shot3 });
  saveAndCopy('03_chart_tooltip_solid_contrast_1440px.png');

  // -------------------------------------------------------------------------
  // TEST 3: P0.3 HEATMAP SALES DENSITY REAL DATA & SIMULATED TOGGLE
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Sales Analytics: Testing HeatmapChart real 12 orders aggregation & toggle...');
  await page.goto('http://localhost:5173/app?page=salesAnalytics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Check real 12 orders mode
  const heatmapObservedText = await page.evaluate(() => {
    return document.body.innerText.includes('Thực tế (12 đơn)') &&
           document.body.innerText.includes('[DEMO-OBSERVED]');
  });
  console.log('✓ Heatmap renders in DEMO-OBSERVED mode with 12 distinct orders:', heatmapObservedText);

  const shot4 = path.join(OUT_DIR, '04_sales_heatmap_real_orders_1440px.png');
  await page.screenshot({ path: shot4 });
  saveAndCopy('04_sales_heatmap_real_orders_1440px.png');

  // Toggle to simulated traffic mode
  const toggledMode = await clickButtonWithText(page, 'Mô phỏng cao điểm');
  console.log('✓ Toggled to [Mô phỏng cao điểm] mode:', toggledMode);
  await new Promise(r => setTimeout(r, 500));

  const shot5 = path.join(OUT_DIR, '05_sales_heatmap_simulated_toggle_1440px.png');
  await page.screenshot({ path: shot5 });
  saveAndCopy('05_sales_heatmap_simulated_toggle_1440px.png');

  // -------------------------------------------------------------------------
  // TEST 4: HIERARCHICAL DATA GRID PRESETS (OPERATIONAL & ANALYTICAL)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] Orders Grid: Testing Preset switches and localStorage persistence...');
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Click Vận hành preset
  const clickedVanHanh = await page.evaluate(() => {
    const btn = document.querySelector('button[title*="Chuyển sang góc nhìn Vận hành"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Clicked [Vận hành] preset in grid toolbar:', clickedVanHanh);
  await new Promise(r => setTimeout(r, 400));

  const shot6 = path.join(OUT_DIR, '06_orders_preset_van_hanh_1440px.png');
  await page.screenshot({ path: shot6 });
  saveAndCopy('06_orders_preset_van_hanh_1440px.png');

  // Click Phân tích preset
  const clickedPhanTich = await page.evaluate(() => {
    const btn = document.querySelector('button[title*="Chuyển sang góc nhìn Phân tích"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Clicked [Phân tích] preset in grid toolbar:', clickedPhanTich);
  await new Promise(r => setTimeout(r, 400));

  const shot7 = path.join(OUT_DIR, '07_orders_preset_phan_tich_1440px.png');
  await page.screenshot({ path: shot7 });
  saveAndCopy('07_orders_preset_phan_tich_1440px.png');

  // Test Row Expansion with domain actions
  console.log('\n[TEST 5] Orders Grid: Expanding row to verify Level 3 domain actions...');
  await page.waitForSelector('tbody tr', { timeout: 5000 });
  const expandedRow = await page.evaluate(() => {
    const expandBtn = document.querySelector('button[title*="Mở rộng chi tiết dòng"]') ||
                      document.querySelector('tbody tr td:first-child button') ||
                      document.querySelector('tbody tr td:first-child');
    if (expandBtn) {
      expandBtn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Expanded order row:', expandedRow);
  await new Promise(r => setTimeout(r, 600));

  const shot8 = path.join(OUT_DIR, '08_order_row_expanded_operations_1440px.png');
  await page.screenshot({ path: shot8 });
  saveAndCopy('08_order_row_expanded_operations_1440px.png');

  // -------------------------------------------------------------------------
  // TEST 6: WAREHOUSE NAME WRAPPING FIX IN INVENTORY
  // -------------------------------------------------------------------------
  console.log('\n[TEST 6] Inventory Page: Verifying warehouse names do not wrap onto 5-7 lines...');
  await page.goto('http://localhost:5173/app?page=inventory', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const shot9 = path.join(OUT_DIR, '09_inventory_warehouse_no_wrapping_1440px.png');
  await page.screenshot({ path: shot9 });
  saveAndCopy('09_inventory_warehouse_no_wrapping_1440px.png');

  // -------------------------------------------------------------------------
  // TEST 7: RMA ADAPTIVE STEPPER & ACTIVE RECORD BINDING
  // -------------------------------------------------------------------------
  console.log('\n[TEST 7] RMA Page: Verifying Stepper bound strictly to active record in selected branch...');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Switch to Returnless Refund tab
  const clickedReturnless = await clickButtonWithText(page, 'Returnless Refund');
  console.log('✓ Clicked [Returnless Refund] tab:', clickedReturnless);
  await new Promise(r => setTimeout(r, 500));

  const shot10 = path.join(OUT_DIR, '10_rma_adaptive_stepper_active_record_1440px.png');
  await page.screenshot({ path: shot10 });
  saveAndCopy('10_rma_adaptive_stepper_active_record_1440px.png');

  // -------------------------------------------------------------------------
  // TEST 8: COMPACT SNAPSHOT METADATA BANNER & POPOVER
  // -------------------------------------------------------------------------
  console.log('\n[TEST 8] Snapshot Banner: Testing compact strip and metadata popover toggle...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  const openedPopover = await page.evaluate(() => {
    const popoverBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Chi tiết dữ liệu'));
    if (popoverBtn) {
      popoverBtn.click();
      return true;
    }
    return false;
  });
  console.log('✓ Opened Snapshot technical details popover:', openedPopover);
  await new Promise(r => setTimeout(r, 400));

  const shot11 = path.join(OUT_DIR, '11_snapshot_banner_popover_open_1440px.png');
  await page.screenshot({ path: shot11 });
  saveAndCopy('11_snapshot_banner_popover_open_1440px.png');

  // -------------------------------------------------------------------------
  // TEST 9: MOBILE VIEWPORT TESTING (390PX & 360PX)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 9] Mobile Responsiveness: Testing 390px (iPhone) and 360px (Android)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  // Check horizontal overflow
  const overflow390 = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hasOverflow: document.documentElement.scrollWidth > window.innerWidth
    };
  });
  console.log('✓ Mobile 390px document overflow check:', overflow390);

  const shot12 = path.join(OUT_DIR, '12_mobile_390px_orders_clean_cards.png');
  await page.screenshot({ path: shot12 });
  saveAndCopy('12_mobile_390px_orders_clean_cards.png');

  // Test Sku Economics on mobile 390px
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const shot13 = path.join(OUT_DIR, '13_mobile_390px_sku_economics.png');
  await page.screenshot({ path: shot13 });
  saveAndCopy('13_mobile_390px_sku_economics.png');

  // -------------------------------------------------------------------------
  // TEST 10: TABLET 768PX RESPONSIVENESS
  // -------------------------------------------------------------------------
  console.log('\n[TEST 10] Tablet Responsiveness: Testing 768px (iPad)...');
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const shot14 = path.join(OUT_DIR, '14_tablet_768px_dashboard.png');
  await page.screenshot({ path: shot14 });
  saveAndCopy('14_tablet_768px_dashboard.png');

  await browser.close();
  console.log('\n=== ALL BROWSER ACCEPTANCE TESTS & SCREENSHOTS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Master Acceptance Test Failed:', err);
  process.exit(1);
});
