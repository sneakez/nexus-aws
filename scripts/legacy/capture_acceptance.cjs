const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.join(__dirname, 'docs', 'design', 'screenshots', 'final-acceptance');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser with chrome:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Helper to ensure mock session with owner role
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

  // 1. Dashboard Live
  console.log('1. Navigating to Dashboard...');
  await page.goto('http://localhost:5173/app?page=dashboard', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_01_dashboard_live.png'), fullPage: false });
  console.log('✓ Captured verified_01_dashboard_live.png');

  // 2. Inventory Canonical 5-State
  console.log('2. Navigating to Inventory (Canonical 5-State)...');
  await page.goto('http://localhost:5173/app?page=inventory', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_02_inventory_canonical.png'), fullPage: false });
  console.log('✓ Captured verified_02_inventory_canonical.png');

  // 3. Inventory Simulation Modal
  console.log('3. Triggering Inventory Simulation Modal...');
  const qcButtons = await page.$$('button');
  for (const btn of qcButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Nghiệm thu QC')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_03_inventory_simulation_modal.png'), fullPage: false });
  console.log('✓ Captured verified_03_inventory_simulation_modal.png');

  // 4. Orders & Drawer
  console.log('4. Navigating to Orders & opening Order Detail Drawer...');
  await page.goto('http://localhost:5173/app?page=orders', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table tbody tr');
  await new Promise(r => setTimeout(r, 1200));

  const firstRow = await page.$('table tbody tr');
  if (firstRow) {
    await firstRow.click();
  }
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_04_order_drawer_lifecycle_pod.png'), fullPage: false });
  console.log('✓ Captured verified_04_order_drawer_lifecycle_pod.png');

  // 5. POD Verification Modal inside Drawer
  console.log('5. Clicking POD verification modal inside drawer...');
  const podButtons = await page.$$('button');
  for (const btn of podButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && (text.includes('POD Bắt buộc') || text.includes('Xác nhận POD') || text.includes('Bằng chứng Giao hàng'))) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_05_order_pod_modal.png'), fullPage: false });
  console.log('✓ Captured verified_05_order_pod_modal.png');

  // 6. Returns Multi-Branch RMA
  console.log('6. Navigating to Returns (Multi-Branch RMA)...');
  await page.goto('http://localhost:5173/app?page=returns', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1200));

  const rmaBtns = await page.$$('button');
  for (const btn of rmaBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Tạo yêu cầu RMA')) {
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_06_returns_multibranch.png'), fullPage: false });
  console.log('✓ Captured verified_06_returns_multibranch.png');

  // 7. Business Rules Review Overview
  console.log('7. Navigating to Business Rules Review page...');
  await page.goto('http://localhost:5173/app?page=businessRules', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_07_business_rules_review.png'), fullPage: false });
  console.log('✓ Captured verified_07_business_rules_review.png');

  // 8. Owner Validation Center - Trigger Success Scenario (QC Pass) -> Capture Result Panel
  console.log('8. Navigating to Owner Validation Center & running Success scenario...');
  await page.goto('http://localhost:5173/app?page=ownerValidation', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1200));

  // Click scenario: '2. QC đạt chuẩn'
  const invScenarioBtns = await page.$$('button');
  for (const btn of invScenarioBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('2. QC đạt chuẩn')) {
      console.log('Clicking "2. QC đạt chuẩn"...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));
  // Scroll down slightly so the Before / Delta / After result panel is prominent
  await page.evaluate(() => window.scrollBy(0, 320));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_08_owner_validation_success_after.png'), fullPage: false });
  console.log('✓ Captured verified_08_owner_validation_success_after.png');

  // 9. Owner Validation Center - Trigger Blocked/Failure Test in Tab 4 (RMA)
  console.log('9. Switching to Tab 4 (RMA) & running Failure/Blocked test...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));

  const allBtnsForTab4 = await page.$$('button');
  for (const btn of allBtnsForTab4) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('4. Đổi Trả RMA')) {
      console.log('Clicking Tab 4 (Đổi Trả RMA)...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));

  // Click failure test button: 'Test Chặn Vượt Giá Trị'
  const rmaScenarioBtns = await page.$$('button');
  for (const btn of rmaScenarioBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Test Chặn Vượt Giá Trị')) {
      console.log('Clicking "Test Chặn Vượt Giá Trị"...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => window.scrollBy(0, 360));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_09_owner_validation_failure_blocked.png'), fullPage: false });
  console.log('✓ Captured verified_09_owner_validation_failure_blocked.png');

  // 10. Owner Validation Center - Tab 3 (Revenue Comparative Table)
  console.log('10. Switching to Tab 3 (Revenue Comparative Table)...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 500));

  const allBtnsForTab3 = await page.$$('button');
  for (const btn of allBtnsForTab3) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('3. Doanh Thu')) {
      console.log('Clicking Tab 3 (Doanh Thu)...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => window.scrollBy(0, 200));
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_10_owner_revenue_comparative_table.png'), fullPage: false });
  console.log('✓ Captured verified_10_owner_revenue_comparative_table.png');

  // 11. Owner Validation Center on Mobile Viewport (390x844)
  console.log('11. Capturing Owner Validation Center on Mobile Viewport (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('http://localhost:5173/app?page=ownerValidation', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_11_owner_validation_mobile_390px.png'), fullPage: false });
  console.log('✓ Captured verified_11_owner_validation_mobile_390px.png');

  // 12. Business Rules Review - Owner Official Decision Modal
  console.log('12. Capturing Owner Official Decision Modal on Business Rules Review...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/app?page=businessRules', { waitUntil: 'networkidle2' });
  await page.waitForSelector('main');
  await new Promise(r => setTimeout(r, 1500));

  const approvalBtns = await page.$$('button');
  for (const btn of approvalBtns) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Chủ Dự Án Phê Duyệt')) {
      console.log('Clicking "Chủ Dự Án Phê Duyệt" button...');
      await btn.click();
      break;
    }
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUT_DIR, 'verified_12_business_rules_approval_modal.png'), fullPage: false });
  console.log('✓ Captured verified_12_business_rules_approval_modal.png');

  await browser.close();
  console.log('=== All 12 browser acceptance screenshots captured successfully! ===');
}

run().catch(err => {
  console.error('Puppeteer script failed:', err);
  process.exit(1);
});
