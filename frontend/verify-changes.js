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
const DEBUG_PORT = 9223;

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

  async waitFor(expression, timeoutMs = 10000) {
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
  const chromeProcess = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--user-data-dir=C:\\Users\\Kushagra\\AppData\\Local\\Temp\\chrome-check-' + Date.now(),
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
  await cdp.setViewport(1280, 850);

  // 1. Landing Page
  console.log('1. Checking Landing page at /...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
  await cdp.waitFor('document.body.innerText.includes("MudraFlow")');
  await new Promise(r => setTimeout(r, 600));
  await cdp.captureScreenshot(path.join(screenshotsDir, 'check-01-landing.png'));

  // 2. Register Page (Centered, Blank, No green panel, No declaration checkbox)
  console.log('2. Checking Register page at /register...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/register' });
  await cdp.waitFor('document.body.innerText.includes("Open your account")');
  await new Promise(r => setTimeout(r, 600));
  await cdp.captureScreenshot(path.join(screenshotsDir, 'check-02-register.png'));

  // Fill and proceed to Step 2 to verify OTP screen
  await cdp.evaluate(`
    (() => {
      function setVal(selector, val) {
        const el = document.querySelector(selector);
        if (!el) return;
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setVal("input[placeholder='e.g. Riya Sharma']", "Aarav Gupta");
      setVal("input[type='date']", "1994-06-20");
      setVal("input[placeholder='e.g. ABCDE1234F']", "ABCPG8821K");
      setVal("input[placeholder='e.g. 9876543210']", "9876543210");
      setVal("input[placeholder='e.g. riya@example.com']", "aarav@example.com");
      setVal("textarea", "Flat 102, Green Avenue, Delhi");
      setVal("input[placeholder='5000']", "5000");
      setVal("input[placeholder='Choose a strong password']", "Pass@1234");
      setVal("input[placeholder='Repeat your password']", "Pass@1234");
      document.querySelector("button[type='submit']").click();
    })()
  `);
  await cdp.waitFor('document.body.innerText.includes("Verify your registration")');
  await new Promise(r => setTimeout(r, 400));
  console.log('   Step 2 OTP screen loaded. Capturing...');
  await cdp.captureScreenshot(path.join(screenshotsDir, 'check-03-register-otp.png'));

  // 3. Staff Login Page
  console.log('3. Checking Staff Login page at /staff/login...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/staff/login' });
  await cdp.waitFor('document.body.innerText.includes("Staff Sign In")');
  await new Promise(r => setTimeout(r, 600));
  await cdp.captureScreenshot(path.join(screenshotsDir, 'check-04-staff-login.png'));

  // 4. Customer Login Page
  console.log('4. Checking Customer Login page at /login...');
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/login' });
  await cdp.waitFor('document.body.innerText.includes("Customer Log In")');
  await new Promise(r => setTimeout(r, 600));
  await cdp.captureScreenshot(path.join(screenshotsDir, 'check-05-customer-login.png'));

  ws.close();
  chromeProcess.kill();
  console.log('All verification checks completed successfully!');
}

run().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});

