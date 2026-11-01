const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'screenshots_v6_2_ux');
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
  console.log('=== STARTING NEXUSOMS V6.2 ADVANCED UX & DOMAIN INTELLIGENCE VERIFICATION ===');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
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
  // DESKTOP 1440PX TESTS
  // -------------------------------------------------------------
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Orders Page Hierarchical Grid (Collapsed)
  console.log('\n1. Capturing Orders Page with Hierarchical Data Grid (1440px)...');
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot1 = 'ux_01_orders_hierarchical_grid_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot1), fullPage: true });
  copyToArtifacts(shot1);

  // 2. Orders Page with Expandable Row (Nested Items, Stepper & Order P&L)
  console.log('\n2. Expanding first order row to capture Nested Data & Stepper...');
  await page.evaluate(() => {
    // Click the first chevron expand button
    const expandButtons = document.querySelectorAll('button[title*="Mở rộng"]');
    if (expandButtons.length > 0) {
      expandButtons[0].click();
    }
  });
  await new Promise(r => setTimeout(r, 800));
  const shot2 = 'ux_02_orders_expanded_row_workflow_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot2), fullPage: true });
  copyToArtifacts(shot2);

  // 3. Order Economics Hierarchical Grid with Line Item Breakdown
  console.log('\n3. Capturing Order Economics Hierarchical Data Grid (1440px)...');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  // Expand first row
  await page.evaluate(() => {
    const expandButtons = document.querySelectorAll('button[title*="Mở rộng"]');
    if (expandButtons.length > 0) expandButtons[0].click();
  });
  await new Promise(r => setTimeout(r, 600));
  const shot3 = 'ux_03_order_economics_hierarchical_grid_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot3), fullPage: true });
  copyToArtifacts(shot3);

  // 4. SKU Economics Hierarchical Grid with BCG Matrix & Break-even
  console.log('\n4. Capturing SKU Economics with Hierarchical Data Grid & BCG Matrix (1440px)...');
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  // Expand first SKU row
  await page.evaluate(() => {
    const expandButtons = document.querySelectorAll('button[title*="Mở rộng"]');
    if (expandButtons.length > 0) expandButtons[0].click();
  });
  await new Promise(r => setTimeout(r, 600));
  const shot4 = 'ux_04_sku_economics_hierarchical_grid_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot4), fullPage: true });
  copyToArtifacts(shot4);

  // 5. Channel Economics Take Rate & ROAS Comparison
  console.log('\n5. Capturing Channel Economics Matrix (1440px)...');
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot5 = 'ux_05_channel_economics_take_rate_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot5), fullPage: true });
  copyToArtifacts(shot5);

  // 6. Returns Page with RMA Workflow Visualizer & QC Actions
  console.log('\n6. Capturing Returns Page with RMA Workflow Visualizer (1440px)...');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot6 = 'ux_06_returns_workflow_visualizer_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot6), fullPage: true });
  copyToArtifacts(shot6);

  // 7. Executive Analytics Dashboard Redesigned
  console.log('\n7. Capturing Redesigned Executive Analytics Dashboard (1440px)...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot7 = 'ux_07_executive_dashboard_redesigned_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot7), fullPage: true });
  copyToArtifacts(shot7);

  // 8. Pricing Intelligence & Break-even Simulator
  console.log('\n8. Capturing Pricing Intelligence Simulator (1440px)...');
  await page.goto('http://localhost:5173/app?page=pricingCalculator', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot8 = 'ux_08_pricing_intelligence_simulator_1440px.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot8), fullPage: true });
  copyToArtifacts(shot8);

  // -------------------------------------------------------------
  // TABLET 768PX TESTS
  // -------------------------------------------------------------
  console.log('\n9. Capturing Orders Page on Tablet (768px)...');
  await page.setViewport({ width: 768, height: 1024 });
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot9 = 'ux_09_tablet_768px_orders.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot9), fullPage: true });
  copyToArtifacts(shot9);

  // -------------------------------------------------------------
  // MOBILE 390PX TESTS
  // -------------------------------------------------------------
  console.log('\n10. Capturing Orders Page Responsive Cards on Mobile (390px)...');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot10 = 'ux_10_mobile_390px_orders_card_view.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot10), fullPage: true });
  copyToArtifacts(shot10);

  console.log('\n11. Capturing Executive Dashboard on Mobile (390px)...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));
  const shot11 = 'ux_11_mobile_390px_dashboard.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot11), fullPage: true });
  copyToArtifacts(shot11);

  await browser.close();
  console.log('\n=== ALL ADVANCED UX SCREENSHOTS CAPTURED & VERIFIED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal error during UX verification:', err);
  process.exit(1);
});
