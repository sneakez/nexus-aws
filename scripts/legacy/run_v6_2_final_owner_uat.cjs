const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'screenshots_v6_2');
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

async function run() {
  console.log('=== STARTING NEXUSOMS V6.2 FINAL OWNER UAT ===');
  console.log('Launching browser with Chrome:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Ensure authenticated owner session
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
  // PHASE 1: BEFORE STATE SCREENSHOTS (SNAPSHOT REPRODUCIBILITY)
  // -------------------------------------------------------------
  console.log('\n--- PHASE 1: CAPTURING BEFORE STATE ---');

  // 1. Executive Dashboard Before
  console.log('1. Capturing Executive Dashboard (Before)...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_01_before_executive_dashboard.png'), fullPage: false });
  copyToArtifacts('uat_01_before_executive_dashboard.png');

  // 2. Channel Economics Before
  console.log('2. Capturing Channel Economics (Before)...');
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_02_before_channel_economics.png'), fullPage: false });
  copyToArtifacts('uat_02_before_channel_economics.png');

  // 3. Order Economics Before (12 Orders)
  console.log('3. Capturing Order Economics (Before 12 Orders)...');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_03_before_order_economics.png'), fullPage: false });
  copyToArtifacts('uat_03_before_order_economics.png');

  // 4. Inventory Analytics Before (980 Units, Value 304.575.000 ₫, 1 Warning SKU)
  console.log('4. Capturing Inventory Analytics (Before)...');
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_04_before_inventory_analytics.png'), fullPage: false });
  copyToArtifacts('uat_04_before_inventory_analytics.png');

  // -------------------------------------------------------------
  // PHASE 2: E2E INTERACTIVE ORDER MUTATION (CREATE -> RESERVE -> DISPATCH)
  // -------------------------------------------------------------
  console.log('\n--- PHASE 2: E2E DIGITAL ORDER CREATION & RESERVATION ---');

  // Perform atomic order placement via mockStore in browser context
  const orderResult = await page.evaluate(() => {
    const store = window.__mockStore;
    if (!store) return { success: false, error: '__mockStore not exposed on window' };

    const inv = store.getInventory5State().find(i => i.sku === 'NX-AIR-PRO');
    if (!inv) return { success: false, error: 'SKU NX-AIR-PRO not found' };

    const beforeReserved = inv.reserved;
    const beforeSellable = inv.sellable;
    const beforePhysical = inv.physical;

    // Place atomic order on Shopee for 2 x NX-AIR-PRO
    const res = store.placeOrderAtomic(
      {
        tenant_id: 'tenant_flagship',
        order_number: 'ORD-UAT-DIGITAL-01',
        customer_id: 'cust_01',
        channel: 'shopee',
        channel_order_sn: '261029SHP-UAT01',
        status: 'pending',
        payment_status: 'paid',
        payment_method: 'bank_transfer',
        subtotal: 2500000,
        tax: 0,
        shipping: 0,
        discount: 0,
        total: 2500000,
        total_amount: 2500000,
        shipping_address: 'Tòa nhà Landmark 81, Bình Thạnh, TP.HCM',
        notes: 'Đơn hàng UAT Nghiệm Thu E2E',
        placed_at: new Date().toISOString()
      },
      [{
        product_id: inv.product_id,
        sku: 'NX-AIR-PRO',
        quantity: 2,
        unit_price: 1250000,
        unit_cost_mac_snapshot: 680000
      }]
    );

    const afterInv = store.getInventory5State().find(i => i.sku === 'NX-AIR-PRO');
    return {
      success: res.success,
      orderId: res.orderId,
      before: { physical: beforePhysical, reserved: beforeReserved, sellable: beforeSellable },
      after: { physical: afterInv.physical, reserved: afterInv.reserved, sellable: afterInv.sellable }
    };
  });

  console.log('Step 1 Order Place & Reserve Result:', orderResult);

  // Reload Inventory page to see reservation effect
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_05_step1_reserve_stock.png'), fullPage: false });
  copyToArtifacts('uat_05_step1_reserve_stock.png');

  // Dispatch Order
  console.log('\n--- PHASE 3: DISPATCH ORDER (PICK / PACK / DISPATCH) ---');
  const dispatchResult = await page.evaluate((orderId) => {
    const store = window.__mockStore;
    const invBefore = store.getInventory5State().find(i => i.sku === 'NX-AIR-PRO');
    const res = store.dispatchOrder(orderId, 'VNPOST-UAT-9988');
    const invAfter = store.getInventory5State().find(i => i.sku === 'NX-AIR-PRO');
    return {
      success: res.success,
      beforePhysical: invBefore.physical,
      afterPhysical: invAfter.physical,
      beforeReserved: invBefore.reserved,
      afterReserved: invAfter.reserved
    };
  }, orderResult.orderId);

  console.log('Step 2 Dispatch Result:', dispatchResult);

  // 6. Capture Inventory after dispatch (Physical decreased by 2)
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_06_step2_dispatch_stock.png'), fullPage: false });
  copyToArtifacts('uat_06_step2_dispatch_stock.png');

  // 7. Capture Order Economics (Now 13 orders, including ORD-UAT-DIGITAL-01)
  console.log('\n--- PHASE 4: CHECKING ORDER ECONOMICS & DASHBOARD AFTER MUTATION ---');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_07_step3_order_economics_new_order.png'), fullPage: false });
  copyToArtifacts('uat_07_step3_order_economics_new_order.png');

  // 8. Capture Executive Dashboard (Net Revenue increases from 23.4M to 25.9M)
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_08_step3_dashboard_new_order.png'), fullPage: false });
  copyToArtifacts('uat_08_step3_dashboard_new_order.png');

  // -------------------------------------------------------------
  // PHASE 5: RMA QC TEST (GOOD RESTOCK VS DAMAGED SCRAP ACCOUNTING)
  // -------------------------------------------------------------
  console.log('\n--- PHASE 5: RMA QC RESTOCK VS DAMAGED SCRAP ---');
  const rmaResult = await page.evaluate(() => {
    const store = window.__mockStore;
    const ret = store.getReturns()[0]; // RMA-2026-009
    if (!ret) return { success: false, error: 'No RMA found' };

    // Inspect return as good condition restock
    const goodRes = store.inspectReturnQC(ret.id, true);
    return { success: goodRes.success, rmaNumber: ret.return_number };
  });

  console.log('Step 4 RMA Inspection Result:', rmaResult);

  // 9. Capture Owner Validation Center (Before/Delta/After table)
  await page.goto('http://localhost:5173/app?page=ownerValidation', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_09_step4_rma_qc_restock.png'), fullPage: false });
  copyToArtifacts('uat_09_step4_rma_qc_restock.png');

  // -------------------------------------------------------------
  // PHASE 6: MOBILE RESPONSIVE VERIFICATION (390PX VIEWPORT)
  // -------------------------------------------------------------
  console.log('\n--- PHASE 6: MOBILE RESPONSIVENESS VERIFICATION (390PX) ---');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // Reset back to baseline for standard reproducible acceptance screenshot
  await page.evaluate(() => {
    window.__mockStore.resetToBaseline();
  });
  await new Promise(r => setTimeout(r, 500));

  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(OUT_DIR, 'uat_10_mobile_responsive_clean.png'), fullPage: false });
  copyToArtifacts('uat_10_mobile_responsive_clean.png');

  await browser.close();
  console.log('\n=== NEXUSOMS V6.2 FINAL OWNER UAT COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('UAT Execution Error:', err);
  process.exit(1);
});
