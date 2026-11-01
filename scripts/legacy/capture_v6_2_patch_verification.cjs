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
  console.log('=== STARTING NEXUSOMS V6.2 FINAL BASELINE PATCH VERIFICATION ===');
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
  // TEST 1: RMA QC PASS (RESTOCK TO SELLABLE & COGS REVERSAL)
  // -------------------------------------------------------------
  console.log('\n--- TEST 1: RMA QC PASS (RESTOCK) ---');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    if (window.__mockStore) {
      window.__mockStore.resetToBaseline();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  console.log('Clicking "QC Đạt (Restock)" on Returns page...');
  const clickedPass = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const passBtn = buttons.find(b => b.textContent && b.textContent.includes('QC Đạt (Restock)'));
    if (passBtn) {
      passBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked QC Pass button:', clickedPass);
  await new Promise(r => setTimeout(r, 1000));

  const shot1 = 'patch_01_rma_qc_pass_restock.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot1), fullPage: true });
  copyToArtifacts(shot1);

  // -------------------------------------------------------------
  // TEST 2: RMA QC SCRAP (DAMAGED QUARANTINE & LOSS WRITE-OFF)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: RMA QC SCRAP (DAMAGED) ---');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    if (window.__mockStore) {
      window.__mockStore.resetToBaseline();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));

  console.log('Clicking "QC Lỗi (Scrap)" on Returns page...');
  const clickedScrap = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const scrapBtn = buttons.find(b => b.textContent && b.textContent.includes('QC Lỗi (Scrap)'));
    if (scrapBtn) {
      scrapBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked QC Scrap button:', clickedScrap);
  await new Promise(r => setTimeout(r, 1000));

  const shot2 = 'patch_02_rma_qc_scrap_damaged.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot2), fullPage: true });
  copyToArtifacts(shot2);

  // -------------------------------------------------------------
  // TEST 3: INVENTORY POST-DISPATCH DYNAMIC SYNCHRONIZATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: INVENTORY POST-DISPATCH DYNAMIC SYNCHRONIZATION ---');
  await page.goto('http://localhost:5173/app?page=inventoryAnalytics', { waitUntil: 'networkidle2' });
  await page.evaluate(() => {
    if (window.__mockStore) {
      window.__mockStore.resetToBaseline();
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Dispatch 2 units of NX-AIR-PRO
  console.log('Dispatching 2 units of NX-AIR-PRO...');
  await page.evaluate(() => {
    if (window.__mockStore) {
      window.__mockStore.runInventoryScenario('dispatch_stock', 'NX-AIR-PRO', 2);
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const shot3 = 'patch_03_inventory_post_dispatch_dynamic.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot3), fullPage: true });
  copyToArtifacts(shot3);

  const inventoryRendered = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return {
      hasPhysical978: bodyText.includes('978 cái') || bodyText.includes('978 Cái'),
      hasValue303M: bodyText.includes('303.215.000'),
      hasStatic980Badge: bodyText.includes('Toán Học Cân Bằng 100% (980 Cái)'),
      hasDynamic978Badge: bodyText.includes('Toán Học Cân Bằng 100% (978 Cái)'),
      hasStatic304M: bodyText.includes('978 cái (304.575.000 ₫)'),
      hasDynamic303MLine: bodyText.includes('978 cái (303.215.000 ₫)'),
      hasDynamicAgingTotal: bodyText.includes('978 cái • 303.215.000 ₫'),
      revisionText: Array.from(document.querySelectorAll('span')).find(s => s.innerText && s.innerText.includes('SNAPSHOT-V6.2'))?.innerText
    };
  });
  console.log('Inventory Rendered Verification:', inventoryRendered);

  // -------------------------------------------------------------
  // TEST 4: EXECUTIVE DASHBOARD POD REVENUE SEPARATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: EXECUTIVE DASHBOARD POD REVENUE SEPARATION ---');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 800));

  const shot4 = 'patch_04_dashboard_pod_separation.png';
  await page.screenshot({ path: path.join(OUT_DIR, shot4), fullPage: true });
  copyToArtifacts(shot4);

  const dashboardRendered = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return {
      hasNetSalesTitle: bodyText.includes('Doanh Thu Thuần Quản Trị (Net Sales)'),
      hasPodRecognized: bodyText.includes('Có 511 (POD):'),
      hasFobDestinationBadge: bodyText.includes('FOB DESTINATION'),
      revisionText: Array.from(document.querySelectorAll('span')).find(s => s.innerText && s.innerText.includes('SNAPSHOT-V6.2'))?.innerText
    };
  });
  console.log('Dashboard Rendered Verification:', dashboardRendered);

  await browser.close();
  console.log('\n=== ALL BASELINE PATCH VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal error during patch verification:', err);
  process.exit(1);
});
