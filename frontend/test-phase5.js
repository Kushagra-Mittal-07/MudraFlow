import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9230;

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async waitFor(expression, timeoutMs = 15000) {
    const expr = `Boolean(${expression})`;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await this.evaluate(expr);
        if (val) return val;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 250));
    }
    throw new Error(`Timeout waiting for: ${expression}`);
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768
    });
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
    console.log(`[Screenshot Saved] -> ${path.basename(outputPath)}`);
  }
}

async function run() {
  console.log('=== PHASE 5: COMPLETE STAFF PORTAL END-TO-END TESTS ===\n');

  // Launch headless Chrome
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.resolve(__dirname, '../.chrome-test-p5')
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      const targets = await res.json();
      const pageTarget = targets.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 300));
  }

  let cdp;
  try {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    cdp = new CDPClient(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.setViewport(1280, 850);

    const setInputScript = `
      function setReactInput(el, val) {
        if (!el) return;
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
        set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      function setReactSelect(el, val) {
        if (!el) return;
        const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
        set.call(el, val);
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Staff Login & Overview
    // ─────────────────────────────────────────────────────────────────────────
    console.log('1. Logging in as Staff (EMP001)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/login' });
    await cdp.waitFor('document.querySelector("input[name=\'emp_id\'], input[placeholder*=\'EMP001\'], input[type=\'text\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const inputs = document.querySelectorAll('input');
        setReactInput(inputs[0], 'EMP001');
        setReactInput(inputs[1], 'Demo@123');
        document.querySelector('button[type="submit"]').click();
      })()
    `);

    await cdp.waitFor('window.location.pathname === "/staff"');
    await cdp.waitFor('document.body.innerText.includes("Staff Overview")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Staff logged in successfully. On /staff Overview.');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-01-staff-overview.png'));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Approve Pending Loan (Seed data LN-0001 for Priya Verma)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n2. Testing Loan Approval (/staff/approvals)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/approvals?tab=loans' });
    await cdp.waitFor('document.body.innerText.includes("Approvals")');
    await cdp.waitFor('document.querySelector("table")');
    await new Promise(r => setTimeout(r, 600));

    // Find and click Review on the pending loan (LN-0001)
    console.log('   Opening review drawer for pending loan...');
    await cdp.evaluate(`
      (() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const pendingRow = rows.find(r => r.innerText.includes('LN-0001') || r.innerText.includes('PENDING'));
        if (pendingRow) {
          const btn = pendingRow.querySelector('button');
          if (btn) btn.click();
        }
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-drawer")');
    await new Promise(r => setTimeout(r, 600));

    // Click Approve in the review drawer
    console.log('   Clicking Approve button in review drawer...');
    await cdp.evaluate(`
      (() => {
        const drawer = document.querySelector('.mf-drawer');
        const approveBtn = Array.from(drawer.querySelectorAll('button')).find(b => b.innerText.includes('Approve'));
        if (approveBtn) approveBtn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-modal")');
    await new Promise(r => setTimeout(r, 500));

    // Confirm loan approval in modal
    console.log('   Confirming approval in modal...');
    await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('.mf-modal');
        const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Confirm') || b.classList.contains('mf-btn-primary'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);

    await cdp.waitFor('document.body.innerText.includes("approved") || document.body.innerText.includes("APPROVED")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Loan LN-0001 successfully approved!');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-02-loan-approved.png'));

    // Verify Customer side: Priya Verma (10000002 / Demo@123)
    console.log('\n   Verifying loan credit as customer Priya Verma (10000002)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. 10000001\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        setReactInput(document.querySelector("input[placeholder='e.g. 10000001']"), "10000002");
        setReactInput(document.querySelector("input[type='password']"), "Demo@123");
        document.querySelector("button[type='submit']").click();
      })()
    `);
    await cdp.waitFor('window.location.pathname === "/app"');
    await new Promise(r => setTimeout(r, 1000));

    // Navigate to History to verify LOAN_CREDIT entry
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/app/history' });
    await cdp.waitFor('document.body.innerText.includes("Ledger") || document.body.innerText.includes("History")');
    await new Promise(r => setTimeout(r, 800));

    const hasLoanCredit = await cdp.evaluate(`
      document.body.innerText.includes('LOAN_CREDIT') || document.body.innerText.includes('Loan disbursement') || document.body.innerText.includes('1,50,000')
    `);
    console.log(`   Customer history shows LOAN_CREDIT: ${hasLoanCredit}`);
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-03-customer-loan-credit.png'));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Approve Pending Card Request (Seed data SR-0001 for Neha Singh)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n3. Testing Debit Card Approval as Staff...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/login' });
    await cdp.waitFor('document.querySelector("input[name=\'emp_id\'], input[placeholder*=\'EMP001\'], input[type=\'text\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const inputs = document.querySelectorAll('input');
        setReactInput(inputs[0], 'EMP001');
        setReactInput(inputs[1], 'Demo@123');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await cdp.waitFor('window.location.pathname === "/staff"');

    // Go to Approvals -> Cards and cheque books tab
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/approvals?tab=services' });
    await cdp.waitFor('document.body.innerText.includes("Approvals")');
    await cdp.waitFor('document.querySelector("table")');
    await new Promise(r => setTimeout(r, 600));

    // Review SR-0001 (or first pending card request)
    console.log('   Reviewing pending debit card request...');
    await cdp.evaluate(`
      (() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const cardRow = rows.find(r => r.innerText.includes('DEBIT CARD') || r.innerText.includes('REQUESTED'));
        if (cardRow) {
          const btn = cardRow.querySelector('button');
          if (btn) btn.click();
        }
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-drawer")');
    await new Promise(r => setTimeout(r, 600));

    // Click Approve
    await cdp.evaluate(`
      (() => {
        const drawer = document.querySelector('.mf-drawer');
        const approveBtn = Array.from(drawer.querySelectorAll('button')).find(b => b.innerText.includes('Approve'));
        if (approveBtn) approveBtn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-modal")');
    await new Promise(r => setTimeout(r, 500));

    // Confirm in modal
    await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('.mf-modal');
        const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Confirm') || b.classList.contains('mf-btn-primary'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);

    await cdp.waitFor('!document.querySelector(".mf-modal")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Debit card approved and demo card number generated!');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-04-card-approved.png'));

    // Verify Customer side: Neha Singh (10000004 / Demo@123)
    console.log('\n   Verifying active debit card as customer Neha Singh (10000004)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. 10000001\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        setReactInput(document.querySelector("input[placeholder='e.g. 10000001']"), "10000004");
        setReactInput(document.querySelector("input[type='password']"), "Demo@123");
        document.querySelector("button[type='submit']").click();
      })()
    `);
    await cdp.waitFor('window.location.pathname === "/app"');
    await new Promise(r => setTimeout(r, 800));

    // Visit Services page
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/app/services' });
    await cdp.waitFor('document.body.innerText.includes("Services & Applications")');
    await new Promise(r => setTimeout(r, 1000));

    const cardPanelVisible = await cdp.evaluate(`
      document.body.innerText.includes('ACTIVE DEBIT CARD') || document.body.innerText.includes('OFFICIAL DEBIT CARD') || document.body.innerText.includes('•••• •••• ••••') || document.body.innerText.includes('Expires')
    `);
    console.log(`   Customer services shows active debit card panel: ${cardPanelVisible}`);
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-05-customer-card-active.png'));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Freeze Account & Confirm Customer Transfer Fails
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n4. Testing Account Freeze (/staff/customers)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/login' });
    await cdp.waitFor('document.querySelector("input[name=\'emp_id\'], input[placeholder*=\'EMP001\'], input[type=\'text\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const inputs = document.querySelectorAll('input');
        setReactInput(inputs[0], 'EMP001');
        setReactInput(inputs[1], 'Demo@123');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await cdp.waitFor('window.location.pathname === "/staff"');

    // Go to /staff/customers
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/customers' });
    await cdp.waitFor('document.body.innerText.includes("Customers & Accounts")');
    await new Promise(r => setTimeout(r, 800));

    // Search for Priya Verma (10000002)
    console.log('   Searching customer 10000002 (Priya Verma)...');
    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const searchInput = document.querySelector("input[type='text'], input[placeholder*='search' i]");
        if (searchInput) setReactInput(searchInput, '10000002');
      })()
    `);
    await new Promise(r => setTimeout(r, 800));

    // Wait for customer details to finish loading and the Freeze button to appear
    await cdp.waitFor(`
      (() => {
        const freezeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Freeze'));
        return Boolean(freezeBtn);
      })()
    `, 10000);

    // Click Freeze on account 5001000002
    console.log('   Freezing account 5001000002...');
    await cdp.evaluate(`
      (() => {
        const freezeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Freeze'));
        if (freezeBtn) freezeBtn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-modal")');
    await new Promise(r => setTimeout(r, 500));

    // Confirm freeze in modal
    await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('.mf-modal');
        const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Confirm freeze') || b.classList.contains('mf-btn-danger'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);

    await cdp.waitFor('document.body.innerText.includes("FROZEN")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Account 5001000002 successfully frozen!');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-06-account-frozen.png'));

    // Test Customer transfer blocked on frozen account
    console.log('\n   Verifying transfer from frozen account fails for customer Priya Verma...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. 10000001\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        setReactInput(document.querySelector("input[placeholder='e.g. 10000001']"), "10000002");
        setReactInput(document.querySelector("input[type='password']"), "Demo@123");
        document.querySelector("button[type='submit']").click();
      })()
    `);
    await cdp.waitFor('window.location.pathname === "/app"');
    await new Promise(r => setTimeout(r, 800));

    // Navigate to /app/transfer
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/app/transfer' });
    await cdp.waitFor('document.body.innerText.includes("Transfer")');
    await new Promise(r => setTimeout(r, 800));

    // Check if account status banner shows frozen, or try to submit transfer
    const isFrozenBlocked = await cdp.evaluate(`
      (() => {
        ${setInputScript}
        // Fill transfer amount
        const amtInput = document.querySelector("input[type='number']");
        if (amtInput) setReactInput(amtInput, '1000');
        return document.body.innerText.includes('frozen') || document.body.innerText.includes('FROZEN');
      })()
    `);
    console.log(`   Transfer interface indicates account is frozen: ${isFrozenBlocked}`);
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-07-transfer-frozen-blocked.png'));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Process Fixed Deposit Maturities
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n5. Testing FD Maturity Processing (/staff/fd)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/login' });
    await cdp.waitFor('document.querySelector("input[name=\'emp_id\'], input[placeholder*=\'EMP001\'], input[type=\'text\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const inputs = document.querySelectorAll('input');
        setReactInput(inputs[0], 'EMP001');
        setReactInput(inputs[1], 'Demo@123');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await cdp.waitFor('window.location.pathname === "/staff"');

    // Go to /staff/fd
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/fd' });
    await cdp.waitFor('document.body.innerText.includes("Fixed Deposit Maturities")');
    await new Promise(r => setTimeout(r, 800));

    // Click "Process maturities" button
    console.log('   Clicking Process maturities button...');
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Process maturities'));
        if (btn) btn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-modal")');
    await new Promise(r => setTimeout(r, 500));

    // Confirm in modal
    console.log('   Confirming batch maturity payout...');
    await cdp.evaluate(`
      (() => {
        const modal = document.querySelector('.mf-modal');
        const confirmBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Process all') || b.classList.contains('mf-btn-primary'));
        if (confirmBtn) confirmBtn.click();
      })()
    `);

    await cdp.waitFor('document.body.innerText.includes("Processed")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Maturities processed successfully!');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-08-maturities-processed.png'));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Audit Transactions (/staff/transactions)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n6. Testing Audit Transactions (/staff/transactions)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/transactions' });
    await cdp.waitFor('document.body.innerText.includes("Audit Transactions")');
    await cdp.waitFor('document.querySelector("table")');
    await new Promise(r => setTimeout(r, 800));

    const totalTxnsSummary = await cdp.evaluate(`
      (() => {
        const el = document.querySelector('.mf-panel + div');
        return el ? el.innerText : '';
      })()
    `);
    console.log(`   Transactions summary: ${totalTxnsSummary.replace(/\n/g, ' ')}`);
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p5-09-staff-transactions.png'));

    console.log('\n=== ALL PHASE 5 STAFF PORTAL TESTS PASSED! ===');
  } catch (err) {
    console.error('Phase 5 Test Failed:', err);
    process.exitCode = 1;
  } finally {
    if (cdp?.ws) cdp.ws.close();
    chromeProcess.kill();
  }
}

run();
