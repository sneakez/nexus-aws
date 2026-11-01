const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'screenshots_phase2');
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

  // 1. Channel Economics Digital Only
  console.log('1. Navigating to Channel Economics (Digital Only)...');
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  const shot1 = path.join(OUT_DIR, 'v6_phase2_01_channel_economics_digital_only.png');
  await page.screenshot({ path: shot1, fullPage: false });
  fs.copyFileSync(shot1, path.join(ARTIFACT_DIR, 'v6_phase2_01_channel_economics_digital_only.png'));
  console.log('✓ Captured v6_phase2_01_channel_economics_digital_only.png');

  // 2. Order Economics with Digital-Only Filters
  console.log('2. Navigating to Order Economics...');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  const shot2 = path.join(OUT_DIR, 'v6_phase2_02_order_economics_filter.png');
  await page.screenshot({ path: shot2, fullPage: false });
  fs.copyFileSync(shot2, path.join(ARTIFACT_DIR, 'v6_phase2_02_order_economics_filter.png'));
  console.log('✓ Captured v6_phase2_02_order_economics_filter.png');

  // 3. Executive Dashboard Digital Multi-Channel Matrix
  console.log('3. Navigating to Executive Dashboard...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  const shot3 = path.join(OUT_DIR, 'v6_phase2_03_executive_dashboard_channels.png');
  await page.screenshot({ path: shot3, fullPage: false });
  fs.copyFileSync(shot3, path.join(ARTIFACT_DIR, 'v6_phase2_03_executive_dashboard_channels.png'));
  console.log('✓ Captured v6_phase2_03_executive_dashboard_channels.png');

  // 4. Public Landing Page Repositioning
  console.log('4. Navigating to Public Landing Page...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1');
  await new Promise(r => setTimeout(r, 1500));
  const shot4 = path.join(OUT_DIR, 'v6_phase2_04_public_landing_repositioning.png');
  await page.screenshot({ path: shot4, fullPage: false });
  fs.copyFileSync(shot4, path.join(ARTIFACT_DIR, 'v6_phase2_04_public_landing_repositioning.png'));
  console.log('✓ Captured v6_phase2_04_public_landing_repositioning.png');

  // 5. Mobile 390px Channel Economics
  console.log('5. Navigating to Mobile Channel Economics (390px)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  const shot5 = path.join(OUT_DIR, 'v6_phase2_05_mobile_channel_economics_390px.png');
  await page.screenshot({ path: shot5, fullPage: false });
  fs.copyFileSync(shot5, path.join(ARTIFACT_DIR, 'v6_phase2_05_mobile_channel_economics_390px.png'));
  console.log('✓ Captured v6_phase2_05_mobile_channel_economics_390px.png');

  await browser.close();
  console.log('Phase 2 Digital Commerce screenshots successfully captured and copied to artifact directory!');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
