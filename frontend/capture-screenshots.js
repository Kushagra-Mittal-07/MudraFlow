import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = 4173;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '/styleguide') {
    reqPath = '/index.html';
  }

  let filePath = path.join(distDir, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

server.listen(port, async () => {
  console.log(`Server listening at http://localhost:${port}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const out1280 = path.resolve(__dirname, '../docs/screenshots/styleguide-1280px.png');
  const out390 = path.resolve(__dirname, '../docs/screenshots/styleguide-390px.png');

  function runChrome(args) {
    return new Promise((resolve, reject) => {
      execFile(chromePath, args, (err, stdout, stderr) => {
        if (err) {
          console.error('Chrome err:', err);
          reject(err);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  try {
    console.log('Capturing 1280px screenshot...');
    await runChrome([
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=1280,4800`,
      `--screenshot=${out1280}`,
      `http://localhost:${port}/styleguide`
    ]);
    console.log(`Saved 1280px screenshot to ${out1280}`);

    console.log('Capturing 390px screenshot...');
    await runChrome([
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=390,7800`,
      `--screenshot=${out390}`,
      `http://localhost:${port}/styleguide`
    ]);
    console.log(`Saved 390px screenshot to ${out390}`);

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('Failed to capture screenshots:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
