const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'screenshots_v6_2');
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\8a04f802-e5a0-46f9-bd6e-2bf71f22b582';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
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

  // Ensure mock authenticated session as owner
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

  // 1. Executive Dashboard (Snapshot Banner, 14-Step Waterfall, Period Comparison, Reconciled KPIs)
  console.log('1. Navigating to Executive Dashboard...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 2000));
  const shot1 = path.join(OUT_DIR, 'v6_2_quality_01_executive_dashboard.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, 'v6_2_quality_01_executive_dashboard.png'));
  console.log('✓ Captured v6_2_quality_01_executive_dashboard.png');

  // 2. Channel Economics (Snapshot Banner, Dynamic Switcher, Reconciliation Audit Table)
  console.log('2. Navigating to Channel Economics...');
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 2000));
  const shot2 = path.join(OUT_DIR, 'v6_2_quality_02_channel_economics.png');
  await page.screenshot({ path: shot2, fullPage: false });
  fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, 'v6_2_quality_02_channel_economics.png'));
  console.log('✓ Captured v6_2_quality_02_channel_economics.png');

  // 3. Order Economics (Snapshot Banner, 12 Orders Reconciled Table, CM1-CM2-CM3)
  console.log('3. Navigating to Order Economics...');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 2000));
  const shot3 = path.join(OUT_DIR, 'v6_2_quality_03_order_economics.png');
  await page.screenshot({ path: shot3, fullPage: false });
  fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, 'v6_2_quality_03_order_economics.png'));
  console.log('✓ Captured v6_2_quality_03_order_economics.png');

  // 4. Inventory Analytics (Inventory Value 304.575.000 ₫, Invariant 980, Callout Box, Aging)
  console.log('4. Navigating to Inventory Analytics...');
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 2000));
  const shot4 = path.join(OUT_DIR, 'v6_2_quality_04_inventory_analytics.png');
  await page.screenshot({ path: shot4, fullPage: false });
  fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, 'v6_2_quality_04_inventory_analytics.png'));
  console.log('✓ Captured v6_2_quality_04_inventory_analytics.png');

  // 5. Mobile 390px Executive Dashboard
  console.log('5. Navigating to Mobile Executive Dashboard (390px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 2000));
  const shot5 = path.join(OUT_DIR, 'v6_2_quality_05_mobile_dashboard_390px.png');
  await page.screenshot({ path: shot5, fullPage: false });
  fs.copyFileSync(shot5, path.join(ARTIFACT_DIR, 'v6_2_quality_05_mobile_dashboard_390px.png'));
  console.log('✓ Captured v6_2_quality_05_mobile_dashboard_390px.png');

  await browser.close();
  console.log('All 5 quality gate screenshots successfully captured and copied to artifact directory!');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
