const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'screenshots');
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

  // 1. Executive Dashboard with 7-Day Filter & Period Comparison
  console.log('1. Navigating to Executive Dashboard and selecting 7-day period...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1200));

  // Click on "7 ngày qua" button
  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.textContent, b);
    if (text && text.includes('7 ngày qua')) {
      await b.click();
      console.log('Clicked "7 ngày qua" filter');
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));
  const shot13 = path.join(OUT_DIR, 'v6_13_dashboard_period_comparison.png');
  await page.screenshot({ path: shot13, fullPage: false });
  fs.copyFileSync(shot13, path.join(ARTIFACT_DIR, 'v6_13_dashboard_period_comparison.png'));
  console.log('✓ Captured v6_13_dashboard_period_comparison.png');

  // 2. SKU Economics Filtered (Search + Star Rank)
  console.log('2. Navigating to SKU Economics and applying Star filter...');
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1200));

  // Select "STAR" in dropdown
  const rankSelect = await page.$('select');
  if (rankSelect) {
    await rankSelect.select('STAR');
    console.log('Selected STAR rank filter');
  }
  // Fill search input
  const searchInput = await page.$('input[placeholder*="Tìm mã SKU"]');
  if (searchInput) {
    await searchInput.type('NEXUS');
    console.log('Typed search filter NEXUS');
  }
  await new Promise(r => setTimeout(r, 1200));
  const shot14 = path.join(OUT_DIR, 'v6_14_sku_economics_filtered.png');
  await page.screenshot({ path: shot14, fullPage: false });
  fs.copyFileSync(shot14, path.join(ARTIFACT_DIR, 'v6_14_sku_economics_filtered.png'));
  console.log('✓ Captured v6_14_sku_economics_filtered.png');

  // 3. Pricing Simulator Interactive Drag
  console.log('3. Navigating to Pricing Intelligence Simulator and adjusting values...');
  await page.goto('http://localhost:5173/app?page=pricingCalculator', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1200));

  // Change range input value
  await page.evaluate(() => {
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    if (rangeInputs.length > 0) {
      // Change basePrice
      const baseSlider = rangeInputs[0];
      baseSlider.value = '850000';
      baseSlider.dispatchEvent(new Event('input', { bubbles: true }));
      baseSlider.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  const shot15 = path.join(OUT_DIR, 'v6_15_pricing_simulator_interactive_drag.png');
  await page.screenshot({ path: shot15, fullPage: false });
  fs.copyFileSync(shot15, path.join(ARTIFACT_DIR, 'v6_15_pricing_simulator_interactive_drag.png'));
  console.log('✓ Captured v6_15_pricing_simulator_interactive_drag.png');

  await browser.close();
  console.log('Interactive screenshots successfully captured and copied to artifact directory!');
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
