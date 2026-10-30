import { firefox } from 'playwright';
import path from 'node:path';
import { RelationalStore } from '../src/engine/store.js';
import { ChaosEngine } from '../src/engine/chaos.js';
import { SchemaParser } from '../src/engine/schema-parser.js';
import { MockSmithServer } from '../src/server.js';

interface TestResult {
  scenario: string;
  target: 'deployed' | 'local';
  status: 'PASS' | 'FAIL';
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  scenario: string,
  target: 'deployed' | 'local',
  fn: () => Promise<void>
): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({
      scenario,
      target,
      status: 'PASS',
      durationMs: Date.now() - start
    });
    console.log(`  ✔ [PASS] (${target}) ${scenario} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      scenario,
      target,
      status: 'FAIL',
      durationMs: Date.now() - start,
      details: err.message
    });
    console.error(`  ✖ [FAIL] (${target}) ${scenario}: ${err.message}`);
  }
}

async function main() {
  console.log('============================================================');
  console.log('MockSmith Independent QA & Product Acceptance Suite');
  console.log('Driver: Playwright Headless Firefox');
  console.log('============================================================\n');

  // Spin up local test server on port 4899
  const store = new RelationalStore();
  const chaos = new ChaosEngine();
  const demo = SchemaParser.generateDemo(store);
  const localServer = new MockSmithServer(store, chaos, demo.routes, { port: 4899 });
  localServer.setInitialSeed(demo.initialData);
  await localServer.listen();
  console.log('✔ Local MockSmith server running on http://localhost:4899\n');

  const browser = await firefox.launch({ headless: true });

  try {
    // -------------------------------------------------------------
    // PART 1: Public Deployed Version (https://georgefifth.github.io/mocksmith/)
    // -------------------------------------------------------------
    console.log('--- 1. Testing Deployed Production (GitHub Pages) ---');
    const deployedContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const deployedPage = await deployedContext.newPage();
    const deployedConsoleErrors: string[] = [];
    deployedPage.on('console', (msg) => {
      if (msg.type() === 'error') deployedConsoleErrors.push(msg.text());
    });

    await runTest('First-time load and landing layout', 'deployed', async () => {
      const res = await deployedPage.goto('https://georgefifth.github.io/mocksmith/', {
        waitUntil: 'networkidle',
        timeout: 15000
      });
      if (!res || res.status() >= 400) {
        throw new Error(`HTTP status: ${res?.status()}`);
      }
      const title = await deployedPage.title();
      if (!title.includes('MockSmith')) throw new Error(`Unexpected title: ${title}`);
      await deployedPage.screenshot({ path: 'screenshots/01-deployed-overview.png' });
    });

    await runTest('Interactive API Dispatcher & JSON Response Inspector', 'deployed', async () => {
      // Send initial request
      await deployedPage.click('button:has-text("Send Request")');
      await deployedPage.waitForSelector('#console-response-box', { state: 'visible' });

      const resStatus = await deployedPage.textContent('#console-res-status');
      if (!resStatus || !resStatus.includes('200')) {
        throw new Error(`Expected HTTP 200, got: ${resStatus}`);
      }

      const resBody = await deployedPage.textContent('#console-res-body');
      if (!resBody || !resBody.includes('Ada Lovelace')) {
        throw new Error('Response body missing expected demo user');
      }
    });

    await runTest('State Tables: Row mutation and Modal Add Record', 'deployed', async () => {
      await deployedPage.click('button:has-text("Relational State Tables")');
      await deployedPage.waitForSelector('#state-table tbody tr', { state: 'visible' });

      // Click Add Record to open modal
      await deployedPage.click('button:has-text("+ Add Record")');
      await deployedPage.waitForSelector('#record-modal', { state: 'visible' });

      // Fill in new user
      await deployedPage.fill(
        '#modal-json',
        JSON.stringify({ name: 'Hypatia of Alexandria', email: 'hypatia@alexandria.edu' })
      );
      await deployedPage.click('#record-modal button:has-text("Save")');
      await deployedPage.waitForSelector('#record-modal', { state: 'hidden' });

      // Verify row is added
      const tableContent = await deployedPage.textContent('#state-table');
      if (!tableContent || !tableContent.includes('Hypatia of Alexandria')) {
        throw new Error('New record not reflected in state table');
      }
      await deployedPage.screenshot({ path: 'screenshots/02-deployed-table-state.png' });
    });

    await runTest('API Catalog navigation and Try It autofill', 'deployed', async () => {
      await deployedPage.click('button:has-text("API Catalog & Routes")');
      await deployedPage.waitForSelector('#routes-tbody tr', { state: 'visible' });

      // Click "Try It" on first route
      await deployedPage.click('#routes-tbody tr:first-child button:has-text("Try It")');

      // Verify it switched back to traffic tab
      const isTrafficActive = await deployedPage.$eval('#tab-traffic', (el) =>
        el.classList.contains('active')
      );
      if (!isTrafficActive) throw new Error('Did not switch back to Traffic tab');
    });

    await runTest('Chaos Sandbox slider adjustments', 'deployed', async () => {
      await deployedPage.click('button:has-text("Chaos & Fault Sandbox")');
      await deployedPage.check('#chaos-enable');

      // Adjust latency slider to 500
      await deployedPage.$eval('#chaos-latency', (el: any) => {
        el.value = 500;
        el.dispatchEvent(new Event('input'));
      });
      const latencyText = await deployedPage.textContent('#latency-val');
      if (!latencyText?.includes('500')) throw new Error('Latency slider label mismatch');

      await deployedPage.screenshot({ path: 'screenshots/03-deployed-chaos.png' });
    });

    await runTest('Responsive mobile viewport rendering (375x667)', 'deployed', async () => {
      await deployedPage.setViewportSize({ width: 375, height: 667 });
      await deployedPage.waitForTimeout(300);
      await deployedPage.screenshot({ path: 'screenshots/04-deployed-mobile.png' });
      // Reset viewport
      await deployedPage.setViewportSize({ width: 1280, height: 800 });
    });

    await runTest('Zero uncaught console errors on deployed site', 'deployed', async () => {
      if (deployedConsoleErrors.length > 0) {
        throw new Error(`Console errors found: ${deployedConsoleErrors.join('; ')}`);
      }
    });

    await deployedContext.close();

    // -------------------------------------------------------------
    // PART 2: Local Full-Stack Node.js Server (http://localhost:4899/_mocksmith)
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Local Full-Stack Engine (http://localhost:4899) ---');
    const localContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const localPage = await localContext.newPage();
    const localConsoleErrors: string[] = [];
    localPage.on('console', (msg) => {
      if (msg.type() === 'error') localConsoleErrors.push(msg.text());
    });

    // Accept browser native prompts/confirms automatically
    localPage.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await runTest('Local Studio dashboard startup & SSE connection', 'local', async () => {
      await localPage.goto('http://localhost:4899/_mocksmith', { waitUntil: 'networkidle' });
      const statusPill = await localPage.textContent('.status-pill');
      if (!statusPill || !statusPill.includes('LIVE ENGINE')) {
        throw new Error(`Status pill mismatch: ${statusPill}`);
      }
      await localPage.screenshot({ path: 'screenshots/05-local-desktop-studio.png' });
    });

    await runTest('Contract Schema Validation (400 Bad Request on invalid payload)', 'local', async () => {
      // Send an invalid payload missing required fields
      await localPage.selectOption('#req-method', 'POST');
      await localPage.fill('#req-url', '/api/users');
      // Trigger display of body
      await localPage.$eval('#req-method', (el) => el.dispatchEvent(new Event('change')));
      await localPage.fill('#req-body-text', JSON.stringify({ status: 'INVALID_ENUM' }));

      await localPage.click('button:has-text("Send Request")');
      await localPage.waitForSelector('#console-response-box', { state: 'visible' });

      const resStatus = await localPage.textContent('#console-res-status');
      if (!resStatus || !resStatus.includes('400')) {
        throw new Error(`Expected HTTP 400 Bad Request for invalid schema, got: ${resStatus}`);
      }
      const resBody = await localPage.textContent('#console-res-body');
      if (!resBody || !resBody.includes('Validation Error')) {
        throw new Error('Response body missing structured Validation Error');
      }
    });

    await runTest('Visual Modal Editor: Add record & verify live state', 'local', async () => {
      await localPage.click('button:has-text("Relational State Tables")');
      await localPage.waitForSelector('#state-table tbody tr', { state: 'visible' });

      await localPage.click('button:has-text("+ Add Record")');
      await localPage.waitForSelector('#record-modal', { state: 'visible' });

      await localPage.fill(
        '#modal-json-text',
        JSON.stringify({
          name: 'Katherine Johnson',
          email: 'katherine@nasa.gov',
          status: 'active'
        })
      );
      await localPage.click('#modal-save-btn');
      await localPage.waitForSelector('#record-modal', { state: 'hidden' });

      const tableContent = await localPage.textContent('#state-table');
      if (!tableContent?.includes('Katherine Johnson')) {
        throw new Error('Added record not present in database table');
      }
      await localPage.screenshot({ path: 'screenshots/06-local-modal-editor.png' });
    });

    await runTest('State Scenario Switching (Empty State -> Initial Seed)', 'local', async () => {
      // 1. Select empty-state
      await localPage.selectOption('#snapshot-select', 'empty-state');
      await localPage.click('button:has-text("Load Scenario")');
      await localPage.waitForTimeout(300);

      // Verify table shows empty
      const emptyContent = await localPage.textContent('#state-tbody');
      if (!emptyContent?.includes('No records')) {
        throw new Error('Empty state scenario did not clear table');
      }
      await localPage.screenshot({ path: 'screenshots/07-local-empty-state.png' });

      // 2. Restore initial-seed
      await localPage.selectOption('#snapshot-select', 'initial-seed');
      await localPage.click('button:has-text("Load Scenario")');
      await localPage.waitForTimeout(300);

      const restoredRows = await localPage.$$('#state-tbody tr');
      if (restoredRows.length < 3) {
        throw new Error('Initial seed scenario did not restore items');
      }
    });

    await runTest('Webhook Subscription & Delivery Log Tracking', 'local', async () => {
      await localPage.click('button:has-text("Webhooks & Outbound Events")');
      await localPage.waitForSelector('#webhooks-tbody', { state: 'visible' });

      // Click + Register Webhook
      await localPage.click('button:has-text("+ Register Webhook")');
      await localPage.waitForTimeout(400);

      // Verify webhook row appears
      const whRows = await localPage.$$('#webhooks-tbody tr');
      if (whRows.length === 0) throw new Error('No webhook registered');

      // Click Trigger on the first registered webhook
      await localPage.click('#webhooks-tbody tr:first-child button:has-text("Trigger")');
      await localPage.waitForTimeout(500);

      // Verify delivery log table has an entry
      const delRows = await localPage.$$('#wh-deliveries-tbody tr');
      if (delRows.length === 0) throw new Error('Delivery log is empty after trigger');

      await localPage.screenshot({ path: 'screenshots/08-local-webhooks.png' });
    });

    await runTest('Export OpenAPI & Bruno specifications', 'local', async () => {
      const [downloadOas] = await Promise.all([
        localPage.waitForEvent('download'),
        localPage.click('a:has-text("Export OpenAPI")')
      ]);
      const oasPath = await downloadOas.path();
      if (!oasPath) throw new Error('OpenAPI export download failed');

      const [downloadBruno] = await Promise.all([
        localPage.waitForEvent('download'),
        localPage.click('a:has-text("Export Bruno")')
      ]);
      const brunoPath = await downloadBruno.path();
      if (!brunoPath) throw new Error('Bruno export download failed');
    });

    await runTest('Zero uncaught console errors on local engine', 'local', async () => {
      if (localConsoleErrors.length > 0) {
        throw new Error(`Console errors found: ${localConsoleErrors.join('; ')}`);
      }
    });

    await localContext.close();
  } finally {
    await browser.close();
    await localServer.close();
    console.log('\n✔ Test environment cleanly shut down.');
  }

  // -------------------------------------------------------------
  // Summary Report
  // -------------------------------------------------------------
  console.log('\n============================================================');
  console.log('ACCEPTANCE SUMMARY REPORT');
  console.log('============================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Scenarios: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
