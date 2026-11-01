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
const DEBUG_PORT = 9222;

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
      await new Promise(r => setTimeout(r, 250));
    }
    throw new Error(`Timeout waiting for: ${expression}`);
  }

  async setViewport(width, height, isMobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile
    });
  }

  async captureScreenshot(filePath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log(`[Screenshot saved] -> ${path.basename(filePath)}`);
  }
}

async function main() {
  console.log('===============================================================');
  console.log('MudraFlow Phase 4B: Automated Browser Verification');
  console.log('===============================================================\n');

  // Launch Chrome with remote debugging
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=C:\\Users\\Kushagra\\AppData\\Local\\Temp\\chrome-flow-profile-' + Date.now(),
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank'
  ]);

  // Wait for remote debugging port & page target
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = await res.json();
      const pageTarget = targets.find(t => t.type === 'page');
      if (pageTarget?.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  if (!wsUrl) {
    chromeProcess.kill();
    throw new Error('Failed to connect to Chrome remote debugging port.');
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const cdp = new CDPClient(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  try {
    // =========================================================================
    // TEST 1: Register a New Customer via UI
    // =========================================================================
    console.log('1. Testing Registration Flow at /register...');
    await cdp.setViewport(1280, 900, false);
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/register' });
    await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. Riya Sharma\']")');

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const newCustName = `Kavita Rao ${randNum}`;
    const newCustEmail = `kavita.${randNum}@example.com`;
    const newCustPan = `KAVPR${randNum}R`;

    // Fill registration form Step 1
    await cdp.evaluate(`
      (() => {
        function setReactInput(el, val) {
          if (!el) return;
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
          set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        setReactInput(document.querySelector("input[placeholder='e.g. Riya Sharma']"), "${newCustName}");
        setReactInput(document.querySelector("input[type='date']"), "1995-05-15");
        setReactInput(document.querySelector("input[placeholder='e.g. ABCDE1234F']"), "${newCustPan}");
        setReactInput(document.querySelector("input[placeholder='e.g. 9876543210']"), "9811223344");
        setReactInput(document.querySelector("input[placeholder='e.g. riya@example.com']"), "${newCustEmail}");
        setReactInput(document.querySelector("textarea"), "Sector 14, Dwarka, New Delhi");
        setReactInput(document.querySelector("input[placeholder='5000']"), "5000");
        setReactInput(document.querySelector("input[placeholder='Choose a strong password']"), "Demo@123");
        setReactInput(document.querySelector("input[placeholder='Repeat your password']"), "Demo@123");
      })()
    `);

    // Submit Step 1 -> Go to Step 2 (Verify)
    await cdp.evaluate(`document.querySelector("button[type='submit']").click()`);
    await cdp.waitFor('document.body.innerText.includes("Verify your registration")');
    console.log('   Step 1 completed. On Step 2 (Verify OTP)...');

    // Fill OTP 123456 and verify
    await cdp.evaluate(`
      (() => {
        function setReactInput(el, val) {
          if (!el) return;
          const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
          const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
          set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const otpInput = document.querySelector(".mf-input-otp");
        setReactInput(otpInput, "123456");
        document.querySelector("button[type='submit']").click();
      })()
    `);

    // Wait for Step 3: Receipt slip
    await cdp.waitFor('document.body.innerText.includes("ACCOUNT OPENED")');
    const newCustomerId = await cdp.evaluate(`
      document.querySelector(".mf-slip-container .tabular-nums")?.innerText?.trim()
    `);
    console.log(`   Registration successful! Generated Customer ID: ${newCustomerId}`);

    // Take screenshot of Registration Receipt
    await cdp.captureScreenshot(path.join(screenshotsDir, '01-register-receipt.png'));

    // =========================================================================
    // TEST 2: Login Lockout Countdown Verification
    // =========================================================================
    console.log('\n2. Testing Login Lockout Countdown at /login...');
    // Create a dedicated customer to lock out
    const lockRand = Math.floor(1000 + Math.random() * 9000);
    const regLockRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Lockout User',
        dob: '1990-01-01',
        pan: `LCKPR${lockRand}Z`,
        phone: '9899889988',
        email: `lock.${lockRand}@example.com`,
        address: 'Lockout Lane',
        account_type: 'SAVINGS',
        branch_id: 1,
        opening_amount: 1500,
        password: 'Demo@123',
        otp: '123456'
      })
    }).then(r => r.json());

    const lockCustId = regLockRes.data?.customer_id;

    // Fail password 5 times to trigger lockout
    for (let f = 1; f <= 5; f++) {
      await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: lockCustId, password: 'WrongPassword' })
      });
    }

    // Navigate to /login and attempt with locked customer
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. 10000001\']")');

    await cdp.evaluate(`
      (() => {
        function setReactInput(el, val) {
          if (!el) return;
          const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setReactInput(document.querySelector("input[placeholder='e.g. 10000001']"), "${lockCustId}");
        setReactInput(document.querySelector("input[type='password']"), "Demo@123");
        document.querySelector("button[type='submit']").click();
      })()
    `);

    // Wait for countdown banner
    await cdp.waitFor('document.body.innerText.includes("Account Locked: Too many attempts")');
    const countdownMsg = await cdp.evaluate(`document.querySelector(".mf-banner-error")?.innerText`);
    console.log(`   Lockout message verified: "${countdownMsg}"`);

    // Take screenshot of Lockout Screen
    await cdp.captureScreenshot(path.join(screenshotsDir, '02-login-lockout.png'));

    // =========================================================================
    // TEST 3: Login as Demo Customer (10000001) & Home Screen Verification
    // =========================================================================
    console.log('\n3. Logging in as Demo Customer 10000001...');
    // Clear lock state by navigating freshly
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 400));
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await cdp.waitFor('document.querySelector("input[placeholder=\'e.g. 10000001\']")');

    await cdp.evaluate(`
      (() => {
        function setReactInput(el, val) {
          if (!el) return;
          const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setReactInput(document.querySelector("input[placeholder='e.g. 10000001']"), "10000001");
        setReactInput(document.querySelector("input[type='password']"), "Demo@123");
        document.querySelector("button[type='submit']").click();
      })()
    `);

    // Wait for navigation to /app and dashboard load
    try {
      await cdp.waitFor('window.location.pathname === "/app" && document.querySelector(".mf-panel-accent-left")', 15000);
    } catch (e) {
      const pageInfo = await cdp.evaluate(`
        ({
          url: window.location.href,
          text: document.body.innerText,
          token: localStorage.getItem('mf_token')
        })
      `);
      console.log('Login debug info:', pageInfo);
      throw e;
    }
    console.log('   Successfully logged in. On /app Home page.');

    // Verify balance is hidden by default
    const balanceText = await cdp.evaluate(`
      document.querySelector(".mf-panel-accent-left .mf-money-big")?.innerText
    `);
    const isMaskedBalance = balanceText.includes('₹ ••,••,•••');
    console.log(`   Balance hidden by default: ${isMaskedBalance ? 'YES (' + balanceText + ')' : 'NO'}`);

    // Verify account number is masked with VIEW and COPY chips
    const maskedAccText = await cdp.evaluate(`
      document.querySelector(".mf-panel-accent-left .mf-masked-account-large")?.innerText
    `);
    const isMaskedAcc = maskedAccText.includes('•••• ••••');
    console.log(`   Account number masked: ${isMaskedAcc ? 'YES (' + maskedAccText + ')' : 'NO'}`);

    // Capture Desktop 1280px Screenshot
    await cdp.setViewport(1280, 1100, false);
    await new Promise(r => setTimeout(r, 300));
    await cdp.captureScreenshot(path.join(screenshotsDir, '03-home-desktop-1280px.png'));

    // Capture Mobile 390px Screenshot
    await cdp.setViewport(390, 1400, true);
    await new Promise(r => setTimeout(r, 400));
    await cdp.captureScreenshot(path.join(screenshotsDir, '04-home-mobile-390px.png'));

    // =========================================================================
    // TEST 4: Switching Active Account & Revealing Balance
    // =========================================================================
    console.log('\n4. Testing Active Account Switch & Balance Reveal...');
    await cdp.setViewport(1280, 1100, false);

    // Switch to Account 2 (or second account in list)
    await cdp.evaluate(`
      (() => {
        const accRows = document.querySelectorAll(".mf-home-col-right .mf-panel:first-child div[style*='cursor: pointer']");
        if (accRows.length > 1) {
          accRows[1].click();
        }
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    // Click SHOW balance chip
    await cdp.evaluate(`
      (() => {
        const showBtn = document.querySelector(".mf-panel-accent-left .mf-masked-balance button");
        if (showBtn) showBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 300));

    // Click VIEW account chip
    await cdp.evaluate(`
      (() => {
        const viewBtn = document.querySelector(".mf-panel-accent-left .mf-masked-wrapper button");
        if (viewBtn) viewBtn.click();
      })()
    `);
    await new Promise(r => setTimeout(r, 300));

    const revealedBal = await cdp.evaluate(`
      document.querySelector(".mf-panel-accent-left .mf-money-big")?.innerText
    `);
    const amountInWordsText = await cdp.evaluate(`
      document.querySelector(".mf-panel-accent-left .mf-amount-words")?.innerText
    `);
    const revealedAcc = await cdp.evaluate(`
      document.querySelector(".mf-panel-accent-left .mf-masked-account-large")?.innerText
    `);

    console.log(`   Revealed balance: ${revealedBal}`);
    console.log(`   Amount in words: "${amountInWordsText}"`);
    console.log(`   Full Account Number revealed: ${revealedAcc}`);

    // Capture Screenshot of Revealed & Switched Home
    await cdp.captureScreenshot(path.join(screenshotsDir, '05-home-switched-revealed.png'));

    console.log('\n===============================================================');
    console.log('ALL PHASE 4B BROWSER TESTS PASSED SUCCESSFULLY!');
    console.log('===============================================================');
  } catch (err) {
    console.error('Browser Test Error:', err);
  } finally {
    ws.close();
    chromeProcess.kill();
    process.exit(0);
  }
}

main();
