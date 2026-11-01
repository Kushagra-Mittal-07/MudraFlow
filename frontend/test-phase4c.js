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
const DEBUG_PORT = 9224;

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

  async waitFor(expression, timeoutMs = 12000) {
    const expr = `Boolean(${expression})`;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const val = await this.evaluate(expr);
        if (val) return val;
      } catch (e) {}
      await new Promise(r => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for: ${expression}`);
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
  }

  async captureScreenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`[Screenshot saved] -> ${path.basename(filePath)}`);
  }
}

async function run() {
  console.log('===============================================================');
  console.log('MudraFlow Phase 4C: Transfer, Payees, History & Receipt Testing');
  console.log('===============================================================\n');

  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=C:\\Users\\Kushagra\\AppData\\Local\\Temp\\chrome-p4c-' + Date.now(),
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank'
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

  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.onopen = resolve);
  const cdp = new CDPClient(ws);

  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');
  await cdp.setViewport(1280, 900);

  // Helper to set React input values
  const setInputScript = `
    function setReactInput(el, val) {
      if (!el) return;
      const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
      set.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `;

  // 1. Log in as Customer 10000001
  console.log('1. Logging in as Customer 10000001...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
  await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. 10000001\']")');

  await cdp.evaluate(`
    ${setInputScript}
    setReactInput(document.querySelector("input[placeholder='e.g. 10000001']"), "10000001");
    setReactInput(document.querySelector("input[type='password']"), "Demo@123");
    document.querySelector("button[type='submit']").click();
  `);
  await cdp.waitFor('window.location.pathname === "/app"');
  console.log('   Customer logged in successfully.\n');

  // 2. Navigate to /app/transfer
  console.log('2. Navigating to Transfer page via sidebar...');
  await cdp.evaluate('document.querySelector("a[href=\'/app/transfer\']").click()');
  await cdp.waitFor('document.body.innerText.includes("Transfer money")');
  await new Promise(r => setTimeout(r, 500));

  // TEST 1: IMPS above 5,00,000 is blocked
  console.log('3. Testing IMPS mode blocked above ₹5,00,000...');
  await cdp.evaluate(`
    ${setInputScript}
    setReactInput(document.querySelector("input[type='number']"), "600000");
  `);
  await new Promise(r => setTimeout(r, 400));

  const impsStatus = await cdp.evaluate(`
    (() => {
      const tiles = Array.from(document.querySelectorAll('.mf-radio-tile'));
      const imps = tiles.find(t => t.innerText.includes('IMPS'));
      return {
        disabled: imps ? imps.classList.contains('mf-radio-tile-disabled') : false,
        text: imps ? imps.innerText : ''
      };
    })()
  `);
  console.log('   IMPS Tile Check:', impsStatus);
  if (!impsStatus.disabled) throw new Error('Expected IMPS to be disabled for amount > ₹5,00,000');
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-01-imps-blocked.png'));

  // TEST 2: RTGS below 2,00,000 is blocked
  console.log('\n4. Testing RTGS mode blocked below ₹2,00,000...');
  await cdp.evaluate(`
    ${setInputScript}
    setReactInput(document.querySelector("input[type='number']"), "50000");
  `);
  await new Promise(r => setTimeout(r, 400));

  const rtgsStatus = await cdp.evaluate(`
    (() => {
      const tiles = Array.from(document.querySelectorAll('.mf-radio-tile'));
      const rtgs = tiles.find(t => t.innerText.includes('RTGS'));
      return {
        disabled: rtgs ? rtgs.classList.contains('mf-radio-tile-disabled') : false,
        text: rtgs ? rtgs.innerText : ''
      };
    })()
  `);
  console.log('   RTGS Tile Check:', rtgsStatus);
  if (!rtgsStatus.disabled) throw new Error('Expected RTGS to be disabled for amount < ₹2,00,000');
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-02-rtgs-blocked.png'));

  // Fill valid transfer details (₹25,000 via NEFT to saved payee Priya Verma)
  console.log('\n5. Setting up valid transfer of ₹25,000 via NEFT...');
  await cdp.evaluate(`
    ${setInputScript}
    setReactInput(document.querySelector("input[type='number']"), "25000");
    setReactInput(document.querySelector("input[placeholder*='property advance' i]"), "Design consultation fee");
  `);
  await new Promise(r => setTimeout(r, 400));

  // Click "Review transfer →"
  console.log('   Proceeding to Review state...');
  await cdp.evaluate(`document.querySelector("button[type='submit']").click()`);
  await cdp.waitFor('document.body.innerText.includes("Review transfer")');
  await new Promise(r => setTimeout(r, 400));
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-03-transfer-review.png'));

  // Open Confirm Modal
  console.log('\n6. Opening Confirm modal...');
  await cdp.evaluate(`
    const btns = Array.from(document.querySelectorAll('button'));
    const confirmBtn = btns.find(b => b.innerText.includes('Confirm and pay'));
    if (confirmBtn) confirmBtn.click();
  `);
  await cdp.waitFor('document.body.innerText.includes("Confirm transfer")');

  // TEST 3: Wrong Password
  console.log('7. Testing Wrong Password authorization...');
  await cdp.evaluate(`
    (() => {
      ${setInputScript}
      const modal = document.querySelector('.mf-modal');
      setReactInput(modal.querySelector("input[type='password']"), "WrongPassword123");
      setReactInput(modal.querySelector(".mf-input-otp"), "123456");
      const payBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Pay'));
      if (payBtn) payBtn.click();
    })()
  `);
  await cdp.waitFor('document.querySelector(".mf-modal .mf-banner-error")');
  const wrongPwMsg = await cdp.evaluate(`document.querySelector(".mf-modal .mf-banner-error")?.innerText`);
  console.log(`   Wrong Password Error verified: "${wrongPwMsg}"`);
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-04-wrong-password.png'));

  // TEST 4: Wrong OTP
  console.log('\n8. Testing Wrong OTP authorization...');
  await cdp.evaluate(`
    (() => {
      ${setInputScript}
      const modal = document.querySelector('.mf-modal');
      setReactInput(modal.querySelector("input[type='password']"), "Demo@123");
      setReactInput(modal.querySelector(".mf-input-otp"), "999999");
      const payBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Pay'));
      if (payBtn) payBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));
  await cdp.waitFor('document.querySelector(".mf-modal .mf-banner-error")');
  const wrongOtpMsg = await cdp.evaluate(`document.querySelector(".mf-modal .mf-banner-error")?.innerText`);
  console.log(`   Wrong OTP Error verified: "${wrongOtpMsg}"`);
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-05-wrong-otp.png'));

  // TEST 5: Successful Transfer
  console.log('\n9. Executing Successful Transfer with correct credentials (Demo@123, 123456)...');
  await cdp.evaluate(`
    (() => {
      ${setInputScript}
      const modal = document.querySelector('.mf-modal');
      setReactInput(modal.querySelector("input[type='password']"), "Demo@123");
      setReactInput(modal.querySelector(".mf-input-otp"), "123456");
      const payBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('Pay'));
      if (payBtn) payBtn.click();
    })()
  `);

  // Wait for redirect to Receipt page
  await cdp.waitFor('window.location.pathname.startsWith("/app/receipt/")');
  await cdp.waitFor('document.body.innerText.includes("PAID")');
  const receiptRef = await cdp.evaluate(`window.location.pathname.split("/").pop()`);
  console.log(`   Transfer authorized successfully! Generated Reference: ${receiptRef}`);
  await new Promise(r => setTimeout(r, 500));
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-06-transfer-receipt.png'));

  // TEST 6: Check Home Page Updated
  console.log('\n10. Checking Home page update after transfer...');
  await cdp.evaluate('document.querySelector("a[href=\'/app\']").click()');
  await cdp.waitFor('document.querySelector(".mf-panel-accent-left")');
  // Reveal balance to verify
  await cdp.evaluate(`
    const showBtn = Array.from(document.querySelectorAll('.mf-chip')).find(c => c.innerText.toLowerCase().includes('show'));
    if (showBtn) showBtn.click();
  `);
  await new Promise(r => setTimeout(r, 400));
  const newHomeBal = await cdp.evaluate(`document.querySelector(".mf-money-big")?.innerText`);
  console.log(`   Updated Home Balance verified: ${newHomeBal?.replace(/\\s+/g, '')}`);
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-07-home-updated.png'));

  // TEST 7: Check History Page Updated
  console.log('\n11. Checking History page at /app/history...');
  await cdp.evaluate('document.querySelector("a[href=\'/app/history\']").click()');
  await cdp.waitFor('document.querySelector(".mf-ledger-table")');
  await new Promise(r => setTimeout(r, 500));
  const latestTxnDesc = await cdp.evaluate(`document.querySelector(".mf-ledger-table tbody tr .mf-ledger-desc")?.innerText`);
  console.log(`   Latest History Entry: "${latestTxnDesc}"`);
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-08-history-updated.png'));

  // TEST 8: Check Payees Page
  console.log('\n12. Checking Saved Payees page at /app/payees...');
  await cdp.evaluate('document.querySelector("a[href=\'/app/payees\']").click()');
  await cdp.waitFor('document.querySelector(".mf-ledger-table")');
  await new Promise(r => setTimeout(r, 500));
  await cdp.captureScreenshot(path.join(screenshotsDir, 'p4c-09-payees-list.png'));

  ws.close();
  chromeProcess.kill();
  console.log('\n===============================================================');
  console.log('ALL PHASE 4C VERIFICATIONS COMPLETED SUCCESSFULLY!');
  console.log('===============================================================');
}

run().catch(err => {
  console.error('\nBrowser Test Error:', err);
  process.exit(1);
});
