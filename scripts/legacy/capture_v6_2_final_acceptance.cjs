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

  // 1. Inventory KPIs & Invariant Architecture
  console.log('1. Navigating to Inventory Analytics (Inventory Invariant)...');
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  const shot1 = path.join(OUT_DIR, 'v6_2_01_inventory_kpis_invariant.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, 'v6_2_01_inventory_kpis_invariant.png'));
  console.log('✓ Captured v6_2_01_inventory_kpis_invariant.png');

  // 2. Executive Dashboard Waterfall with All Cost Components
  console.log('2. Navigating to Executive Dashboard (CM Waterfall)...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  const shot2 = path.join(OUT_DIR, 'v6_2_02_waterfall_all_cost_components.png');
  await page.screenshot({ path: shot2, fullPage: false });
  fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, 'v6_2_02_waterfall_all_cost_components.png'));
  console.log('✓ Captured v6_2_02_waterfall_all_cost_components.png');

  // 3. Channel Economics with Assumption Labels & Audit Table
  console.log('3. Navigating to Channel Economics (Assumptions & Audit Table)...');
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  const shot3 = path.join(OUT_DIR, 'v6_2_03_channel_economics_assumptions.png');
  await page.screenshot({ path: shot3, fullPage: false });
  fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, 'v6_2_03_channel_economics_assumptions.png'));
  console.log('✓ Captured v6_2_03_channel_economics_assumptions.png');

  // 4. Mobile 390px Inventory Analytics
  console.log('4. Navigating to Mobile Inventory Analytics (390px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  const shot4 = path.join(OUT_DIR, 'v6_2_04_mobile_inventory_390px.png');
  await page.screenshot({ path: shot4, fullPage: false });
  fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, 'v6_2_04_mobile_inventory_390px.png'));
  console.log('✓ Captured v6_2_04_mobile_inventory_390px.png');

  await browser.close();
  console.log('V6.2 final reconciliation screenshots successfully captured and copied to artifact directory!');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
