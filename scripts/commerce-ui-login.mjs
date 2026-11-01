import { launchUatBrowser } from './uat-browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const base = process.env.UAT_BASE_URL || 'http://127.0.0.1:5174';
const dir = process.env.UAT_OUTPUT_DIR || 'artifacts/ocean-restore/login';
await fs.mkdir(dir, { recursive: true });
const evidence = { head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTree: true, startedAt: new Date().toISOString(), steps: [], logoutAttempts: [], errors: [] };
// Unified Chrome 156 headless on this Windows host drops trusted input after reload.
// The already-installed headless-shell delivers real keyboard/mouse events reliably.
const headless = process.env.UAT_LOGIN_BROWSER === 'chrome' ? true : 'shell';
const browser = await launchUatBrowser({ headless });
evidence.browser = { mode: headless === 'shell' ? 'shell' : 'chrome', version: await browser.version() };
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') evidence.errors.push(m.text()); });
page.on('pageerror', e => evidence.errors.push(String(e)));
await page.setViewport({ width: 1440, height: 1000 });
await page.evaluateOnNewDocument(() => {
  window.__loginEvents = [];
  for (const type of ['focusin', 'focusout', 'keydown', 'keyup', 'click']) {
    document.addEventListener(type, event => {
      const target = event.target.closest?.('button');
      window.__loginEvents.push({ type, key: type.startsWith('key') && !event.target.closest?.('input') ? event.key : undefined, target: event.target.tagName, title: target?.title, trusted: event.isTrusted, at: performance.now() });
    }, true);
  }
});
evidence.isolation = 'One browser/page for all three MVP roles and both activation modes; persistent localStorage, no session/data reset';
const snap = () => page.evaluate(() => JSON.parse(localStorage.getItem('nexus_mock_db_v2')));
const submit = () => page.locator('button[type="submit"]').click();
const workspace = async role => {
  await page.waitForFunction(role => document.querySelector('[data-testid="workspace"]')?.getAttribute('data-role') === role, {}, role);
  await page.waitForSelector('main h1, main h2', { visible: true });
};
const loggedOut = async () => {
  await page.waitForSelector('#login-email', { visible: true });
  await page.waitForFunction(() => !document.querySelector('[data-testid="workspace"]') && JSON.parse(localStorage.getItem('nexus_mock_db_v2'))?.activeUserId === null);
};
const logout = async activation => {
  const selector = 'button[title="Đăng xuất"]';
  await page.waitForSelector(selector, { visible: true });
  await page.bringToFront();
  await page.waitForFunction(() => document.hasFocus() && document.visibilityState === 'visible');
  const attempt = { activation, ...await page.evaluate(() => ({ role: document.querySelector('[data-testid="workspace"]')?.getAttribute('data-role'), documentHasFocus: document.hasFocus() })) };
  evidence.logoutAttempts.push(attempt);
  try {
    if (activation === 'keyboard') {
      await page.focus(selector);
      await page.waitForFunction(selector => document.hasFocus() && document.activeElement === document.querySelector(selector), {}, selector);
      await page.keyboard.press('Space');
    } else {
      await page.locator(selector).click();
    }
    await loggedOut();
  } finally {
    Object.assign(attempt, await page.evaluate(() => ({ events: window.__loginEvents, activeUserId: JSON.parse(localStorage.getItem('nexus_mock_db_v2'))?.activeUserId, workspace: !!document.querySelector('[data-testid="workspace"]'), button: (() => {const el=document.querySelector('button[title="Đăng xuất"]'); if(!el) return null; const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {x:r.x,y:r.y,w:r.width,h:r.height,hit:hit?.tagName,hitTitle:hit?.closest('button')?.title};})() })));
  }
  assert.ok(attempt.events.some(event => event.type === 'click' && event.title === 'Đăng xuất' && event.trusted), 'Logout must be activated by a real user event');
};
const accounts = [
  ['owner', 'owner@nexusoms.io', 'usr_owner_01'],
  ['manager', 'manager@nexusoms.io', 'usr_manager_01'],
  ['warehouse', 'kho@nexusoms.io', 'usr_warehouse_01'],
];

try {
  await page.goto(`${base}/app`);
  await workspace('owner');
  await logout('pointer');
  await page.locator('#login-email').fill('admin@nexusoms.vn');
  await page.locator('#login-password').fill('demo');
  await submit();
  await page.waitForSelector('[role="alert"]');
  assert.match(await page.$eval('[role="alert"]', e => e.textContent), /không hoạt động|membership|không nằm trong phạm vi|không đúng/i);
  assert.equal((await snap()).activeUserId, null);
  assert.equal(await page.$('[data-testid="workspace"]'), null);
  evidence.steps.push({ name: 'Unknown legacy email cannot log in or fall back to Owner', status: 'PASS' });
  assert.equal(await page.$$eval('[data-demo-role]', els => els.length), 3);
  await page.screenshot({ path: `${dir}/login-options.png`, fullPage: true });
  for (const activation of ['pointer', 'keyboard']) {
    for (const [role, email, userId] of accounts) {
      const result = { name: `${role}: quick fill → exact user → reload → ${activation} logout → signed-out reload`, activation, role, email, userId, checkpoints: {} };
      evidence.steps.push(result);
      await page.locator(`[data-demo-role="${role}"]`).click();
      assert.equal(await page.$eval('#login-email', e => e.value), email);
      await submit();
      await workspace(role);
      let state = await snap();
      assert.equal(state.activeUserId, userId); assert.equal(state.activeRole, role);
      result.checkpoints.signIn = 'PASS';
      await page.reload();
      await workspace(role);
      state = await snap(); assert.equal(state.activeUserId, userId); assert.equal(state.activeRole, role);
      result.checkpoints.reload = 'PASS';
      await page.screenshot({ path: `${dir}/${activation}-${role}-reload.png`, fullPage: true });
      await logout(activation);
      result.checkpoints.logout = 'PASS';
      await page.reload();
      await loggedOut();
      result.checkpoints.signedOutReload = 'PASS';
      await page.screenshot({ path: `${dir}/${activation}-${role}-logout.png`, fullPage: true });
      result.status = 'PASS';
      console.log(JSON.stringify({ role, activation, status: result.status, checkpoints: result.checkpoints }));
    }
  }
  await page.setViewport({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${dir}/login-mobile.png`, fullPage: true });
  assert.deepEqual(evidence.errors, []);
  evidence.status = 'PASS';
} catch (error) {
  evidence.status = 'FAIL'; evidence.failure = String(error);
  evidence.failedState = { activeUserId: (await snap())?.activeUserId, activeRole: (await snap())?.activeRole };
  await page.screenshot({ path: `${dir}/login-failure.png`, fullPage: true }).catch(() => {});
  throw error;
} finally {
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(`${dir}/ui-login-results.json`, JSON.stringify(evidence, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ status: evidence.status, groups: evidence.steps.length, roles: accounts.length, activationModes: 2 }));
