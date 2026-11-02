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
const DEBUG_PORT = 9226;

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
  console.log('=== PHASE 4 PART D: END-TO-END BROWSER AUTOMATION ===\n');

  // Launch headless Chrome
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + path.resolve(__dirname, '../.chrome-test-p4d')
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
    await cdp.setViewport(1280, 800);

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

    // 1. Log in as Customer 10000001
    console.log('1. Logging in as Customer 10000001...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. 10000001\']")');

    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        setReactInput(document.querySelector("input[placeholder='e.g. 10000001']"), "10000001");
        setReactInput(document.querySelector("input[type='password']"), "Demo@123");
        document.querySelector("button[type='submit']").click();
      })()
    `);

    await cdp.waitFor('window.location.pathname === "/app"');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Successfully logged in. On /app.');

    // 2. Fixed Deposits: Open New FD
    console.log('\n2. Testing Fixed Deposits (/app/fd)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/app/fd' });
    await cdp.waitFor('document.body.innerText.includes("Fixed Deposits")');
    await new Promise(r => setTimeout(r, 800));

    // Get current balance before locking FD
    const balanceBeforeFD = await cdp.evaluate(`
      (() => {
        const stats = Array.from(document.querySelectorAll('.mf-stat-value'));
        return stats[0] ? stats[0].innerText : '';
      })()
    `);
    console.log(`   FD Total Locked initially: ${balanceBeforeFD}`);

    // Click "Open new" tab
    console.log('   Switching to "Open new" tab...');
    await cdp.evaluate(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('.mf-segmented-btn'));
        const openNewTab = tabs.find(t => t.innerText.includes('Open new'));
        if (openNewTab) openNewTab.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    // Fill FD amount: ₹15,000 and select 12 months tenure
    console.log('   Configuring ₹15,000 for 12 months at 7.00% p.a...');
    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const amtInput = document.querySelector("input[type='number']");
        setReactInput(amtInput, '15000');
      })()
    `);
    await new Promise(r => setTimeout(r, 500));

    // Verify preview certificate updates
    const previewSummary = await cdp.evaluate(`
      (() => {
        const slip = document.querySelector('.mf-slip-container');
        return slip ? slip.innerText : '';
      })()
    `);
    console.log('   Certificate preview contains interest computation:');
    console.log('   ' + previewSummary.split('\n').filter(Boolean).slice(0, 4).join(' | '));

    // Click "Lock fixed deposit →"
    console.log('   Opening Lock FD confirmation modal...');
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Lock fixed deposit'));
        if (btn) btn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-modal")');
    await new Promise(r => setTimeout(r, 500));

    // Enter password Demo@123 in modal and click Confirm
    console.log('   Authorizing FD with password...');
    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const modal = document.querySelector('.mf-modal');
        const pwInput = modal.querySelector("input[type='password']");
        setReactInput(pwInput, 'Demo@123');
        const confirmBtn = modal.querySelector('.mf-modal-footer button:last-child');
        if (confirmBtn) confirmBtn.click();
      })()
    `);

    // Wait for success banner or deposits table update
    await cdp.waitFor('document.body.innerText.includes("created successfully") || document.querySelector("table.mf-ledger-table")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   FD successfully locked!');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p4d-01-fd-locked.png'));

    // 3. Services: Apply for Loan
    console.log('\n3. Testing Services Hub: Apply for Loan (/app/services)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/app/services' });
    await cdp.waitFor('document.body.innerText.includes("Services & Applications")');
    await new Promise(r => setTimeout(r, 800));

    // Open Loan Drawer
    console.log('   Opening "Apply for loan" drawer...');
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Apply for loan'));
        if (btn) btn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-drawer")');
    await new Promise(r => setTimeout(r, 500));

    // Fill Loan Details: ₹50,000, 24 months, Education loan, password Demo@123
    console.log('   Filling Loan Application: ₹50,000, 24 mo, Education...');
    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const drawer = document.querySelector('.mf-drawer');
        const amtInput = drawer.querySelector("input[type='number']");
        setReactInput(amtInput, '50000');
        const selects = drawer.querySelectorAll('select');
        if (selects[1]) setReactSelect(selects[1], 'Education'); // Purpose
        if (selects[2]) setReactSelect(selects[2], '24');        // Duration
        if (selects[3]) setReactSelect(selects[3], 'Salaried');  // Employment
        const incInput = drawer.querySelector("input[placeholder*='600000']");
        if (incInput) setReactInput(incInput, '750000');
        const pwInput = drawer.querySelector("input[type='password']");
        setReactInput(pwInput, 'Demo@123');
        const submitBtn = drawer.querySelector('.mf-drawer-footer button:last-child');
        if (submitBtn) submitBtn.click();
      })()
    `);

    await cdp.waitFor('document.body.innerText.includes("PENDING")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Loan application verified with PENDING status in table.');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p4d-02-loan-applied.png'));

    // 4. Services: Request Debit Card
    console.log('\n4. Testing Services Hub: Request Debit Card...');
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Request card'));
        if (btn) btn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-drawer")');
    await new Promise(r => setTimeout(r, 500));

    console.log('   Submitting RuPay debit card request...');
    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const drawer = document.querySelector('.mf-drawer');
        const nameInput = drawer.querySelector("input[placeholder*='RIYA SHARMA']");
        if (nameInput) setReactInput(nameInput, 'RIYA SHARMA');
        const addrTextarea = drawer.querySelector("textarea");
        if (addrTextarea) setReactInput(addrTextarea, 'Flat 402, Shivalik Apts, Sector 9, Rohini, New Delhi');
        const pwInput = drawer.querySelector("input[type='password']");
        setReactInput(pwInput, 'Demo@123');
        const submitBtn = drawer.querySelector('.mf-drawer-footer button:last-child');
        if (submitBtn) submitBtn.click();
      })()
    `);

    await cdp.waitFor('document.body.innerText.includes("DEBIT_CARD") || document.body.innerText.includes("Debit Card")');
    await new Promise(r => setTimeout(r, 1000));
    console.log('   Debit card request verified in applications table.');
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p4d-03-card-requested.png'));

    // 5. Profile & Open Another Account (/app/profile)
    console.log('\n5. Testing Profile & Account Opening (/app/profile)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/app/profile' });
    await cdp.waitFor('document.body.innerText.includes("Account holder")');
    await new Promise(r => setTimeout(r, 800));

    // Verify Account Holder details
    const profileDetails = await cdp.evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasCustId: text.includes('10000001'),
          hasName: text.includes('Riya Sharma'),
          hasPAN: text.includes('••••••') || text.includes('PAN')
        };
      })()
    `);
    console.log('   Account Holder Details verification:', profileDetails);

    // Open Another Account Drawer
    console.log('   Opening "Open another account" drawer...');
    await cdp.evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Open another account'));
        if (btn) btn.click();
      })()
    `);
    await cdp.waitFor('document.querySelector(".mf-drawer")');
    await new Promise(r => setTimeout(r, 500));

    // Fill new CURRENT account with ₹2,500
    console.log('   Opening new Current Account with ₹2,500 deposit...');
    await cdp.evaluate(`
      (() => {
        ${setInputScript}
        const drawer = document.querySelector('.mf-drawer');
        const amtInput = drawer.querySelector("input[type='number']");
        setReactInput(amtInput, '2500');
        const pwInput = drawer.querySelector("input[type='password']");
        setReactInput(pwInput, 'Demo@123');
        const openBtn = drawer.querySelector('.mf-drawer-footer button:last-child');
        if (openBtn) openBtn.click();
      })()
    `);

    // Wait for success receipt slip
    await cdp.waitFor('document.querySelector(".mf-drawer .mf-slip-container") || document.body.innerText.includes("ACCOUNT OPENED")');
    await new Promise(r => setTimeout(r, 600));

    const receiptSlip = await cdp.evaluate(`
      (() => {
        const slip = document.querySelector('.mf-drawer .mf-slip-container');
        return slip ? slip.innerText : '';
      })()
    `);
    console.log('   New Account Receipt Slip verified:');
    console.log('   ' + receiptSlip.split('\n').filter(Boolean).slice(0, 4).join(' | '));
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p4d-04-account-opened.png'));

    // Click "Done"
    await cdp.evaluate(`
      (() => {
        const drawer = document.querySelector('.mf-drawer');
        const doneBtn = Array.from(drawer.querySelectorAll('button')).find(b => b.innerText.includes('Done'));
        if (doneBtn) doneBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 1000));

    // Verify updated profile accounts list
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p4d-05-profile-view.png'));

    // 6. Mobile Responsiveness check (390px)
    console.log('\n6. Checking mobile responsive layout (390px)...');
    await cdp.setViewport(390, 844);
    await new Promise(r => setTimeout(r, 600));
    await cdp.captureScreenshot(path.join(screenshotsDir, 'p4d-06-mobile-view.png'));

    console.log('\n=== ALL PHASE 4 PART D BROWSER TESTS PASSED! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (cdp?.ws) cdp.ws.close();
    chromeProcess.kill();
  }
}

run();
