const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'v6', 'screenshots');

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

  // 1. Executive Dashboard
  console.log('1. Navigating to Executive Analytics Dashboard...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_01_executive_dashboard.png'), fullPage: false });
  console.log('✓ Captured v6_01_executive_dashboard.png');

  // 2. Order Economics
  console.log('2. Navigating to Order Economics...');
  await page.goto('http://localhost:5173/app?page=orderEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_02_order_economics.png'), fullPage: false });
  console.log('✓ Captured v6_02_order_economics.png');

  // 3. SKU Economics with 3-Variable Bubble Chart
  console.log('3. Navigating to SKU Economics...');
  await page.goto('http://localhost:5173/app?page=skuEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_03_sku_economics_bubble.png'), fullPage: false });
  console.log('✓ Captured v6_03_sku_economics_bubble.png');

  // 4. Channel Economics
  console.log('4. Navigating to Channel Economics...');
  await page.goto('http://localhost:5173/app?page=channelEconomics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_04_channel_economics.png'), fullPage: false });
  console.log('✓ Captured v6_04_channel_economics.png');

  // 5. Pricing Intelligence Simulator
  console.log('5. Navigating to Pricing Intelligence Simulator...');
  await page.goto('http://localhost:5173/app?page=pricingCalculator', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_05_pricing_intelligence.png'), fullPage: false });
  console.log('✓ Captured v6_05_pricing_intelligence.png');

  // 6. Sales Analytics with Heatmap
  console.log('6. Navigating to Sales Analytics...');
  await page.goto('http://localhost:5173/app?page=salesAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_06_sales_analytics_heatmap.png'), fullPage: false });
  console.log('✓ Captured v6_06_sales_analytics_heatmap.png');

  // 7. Inventory Analytics with Pareto
  console.log('7. Navigating to Inventory Analytics...');
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_07_inventory_analytics_pareto.png'), fullPage: false });
  console.log('✓ Captured v6_07_inventory_analytics_pareto.png');

  // 8. Marketing Analytics
  console.log('8. Navigating to Marketing Analytics...');
  await page.goto('http://localhost:5173/app?page=marketingAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_08_marketing_analytics.png'), fullPage: false });
  console.log('✓ Captured v6_08_marketing_analytics.png');

  // 9. Customer Analytics with Cohort Retention
  console.log('9. Navigating to Customer Analytics...');
  await page.goto('http://localhost:5173/app?page=customerAnalytics', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_09_customer_analytics_cohorts.png'), fullPage: false });
  console.log('✓ Captured v6_09_customer_analytics_cohorts.png');

  // 10. Cash & Working Capital
  console.log('10. Navigating to Cash & Working Capital...');
  await page.goto('http://localhost:5173/app?page=cashWorkingCapital', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_10_cash_working_capital.png'), fullPage: false });
  console.log('✓ Captured v6_10_cash_working_capital.png');

  // 11. Mobile Viewport (390x844) - Executive Dashboard
  console.log('11. Capturing Executive Dashboard on Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_11_executive_dashboard_mobile_390px.png'), fullPage: false });
  console.log('✓ Captured v6_11_executive_dashboard_mobile_390px.png');

  // 12. Mobile Viewport (390x844) - Pricing Intelligence
  console.log('12. Capturing Pricing Intelligence on Mobile Viewport (390x844)...');
  await page.goto('http://localhost:5173/app?page=pricingCalculator', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1800));
  await page.screenshot({ path: path.join(OUT_DIR, 'v6_12_pricing_intelligence_mobile_390px.png'), fullPage: false });
  console.log('✓ Captured v6_12_pricing_intelligence_mobile_390px.png');

  await browser.close();
  console.log('=== All 12 V6 Analytics screenshots captured successfully! ===');
}

run().catch(err => {
  console.error('Puppeteer script failed:', err);
  process.exit(1);
});
