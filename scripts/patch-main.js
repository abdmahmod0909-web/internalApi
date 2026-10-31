const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function findAppResourcesPath() {
  const targetIdx = process.argv.indexOf('--target');
  if (targetIdx !== -1 && process.argv[targetIdx + 1]) {
    const custom = path.resolve(process.cwd(), process.argv[targetIdx + 1]);
    if (fs.existsSync(custom)) return custom;
  }

  const root = path.resolve(__dirname, '..');
  const candidates = [
    path.join(root, 'InternalAPI-darwin-arm64/InternalAPI.app/Contents/Resources/app'),
    path.join(root, 'InternalAPI-darwin-x64/InternalAPI.app/Contents/Resources/app'),
    path.join(root, 'InternalAPI-darwin-universal/InternalAPI.app/Contents/Resources/app'),
    path.join(root, 'InternalAPI-win32-x64/resources/app'),
    path.join(root, 'InternalAPI-linux-x64/resources/app'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  try {
    const entries = fs.readdirSync(root);
    for (const d of entries) {
      const macPath = path.join(root, d, 'InternalAPI.app/Contents/Resources/app');
      if (fs.existsSync(macPath)) return macPath;
      const winPath = path.join(root, d, 'resources/app');
      if (fs.existsSync(winPath)) return winPath;
    }
  } catch (_) {}

  return path.join(root, 'InternalAPI-win32-x64/resources/app');
}

const appResourcesPath = findAppResourcesPath();
const mainJsPath = path.join(appResourcesPath, 'lib/main.js');
const nativefierJsonPath = path.join(appResourcesPath, 'nativefier.json');

console.log('=== InternalAPI Desktop Packager & Patcher ===');
console.log('Target app directory:', appResourcesPath);

if (!fs.existsSync(appResourcesPath)) {
  console.error('Desktop app directory not found at: ' + appResourcesPath);
  process.exit(1);
}

// 1. Bundle backend server into resources/app/server.bundle.js
const serverEntry = path.resolve(__dirname, '../packages/server/src/index.ts');
const serverBundleOut = path.join(appResourcesPath, 'server.bundle.js');
console.log('Bundling backend server to:', serverBundleOut);

try {
  cp.execSync(
    `npx esbuild "${serverEntry}" --bundle --platform=node --target=node18 --outfile="${serverBundleOut}"`,
    { stdio: 'inherit', cwd: path.resolve(__dirname, '..') }
  );
  console.log('✓ Backend server bundled successfully (100% self-contained standalone)');
} catch (bundleErr) {
  console.error('Failed to bundle server with esbuild:', bundleErr);
  process.exit(1);
}

// 2. Copy packages/client/dist into resources/app/client_dist
const clientDistSrc = path.resolve(__dirname, '../packages/client/dist');
const clientDistDest = path.join(appResourcesPath, 'client_dist');
console.log('Copying client dist to:', clientDistDest);

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(clientDistSrc)) {
  copyDirRecursive(clientDistSrc, clientDistDest);
  console.log('✓ Client dist assets copied successfully into desktop bundle');
} else {
  console.error('packages/client/dist not found! Run npm run build first.');
  process.exit(1);
}

// 3. Update nativefier.json to dedicated port 39281
if (fs.existsSync(nativefierJsonPath)) {
  const json = JSON.parse(fs.readFileSync(nativefierJsonPath, 'utf8'));
  json.targetUrl = 'http://127.0.0.1:39281/';
  json.backgroundColor = '#030712';
  fs.writeFileSync(nativefierJsonPath, JSON.stringify(json, null, 2), 'utf8');
  console.log('✓ nativefier.json targetUrl set to http://127.0.0.1:39281/');
}

// 4. Patch main.js
if (!fs.existsSync(mainJsPath)) {
  console.error('main.js not found at ' + mainJsPath);
  process.exit(1);
}

let content = fs.readFileSync(mainJsPath, 'utf8');

// Inject Windows GUI EBADF Protector at the very top of main.js
const ebadfGuard = `// EBADF Windows GUI Stream Protector
if (process.platform === 'win32') {
    const safeIgnore = (err) => {
        if (err && (err.code === 'EBADF' || String(err).includes('EBADF') || String(err).includes('bad file descriptor'))) return;
    };
    try {
        if (process.stdout) {
            process.stdout.on('error', safeIgnore);
            process.stdout.write = (chunk, encoding, cb) => {
                if (typeof encoding === 'function') encoding();
                else if (typeof cb === 'function') cb();
                return true;
            };
        }
        if (process.stderr) {
            process.stderr.on('error', safeIgnore);
            process.stderr.write = (chunk, encoding, cb) => {
                if (typeof encoding === 'function') encoding();
                else if (typeof cb === 'function') cb();
                return true;
            };
        }
    } catch (_) {}
    process.on('uncaughtException', (err) => {
        if (err && (err.code === 'EBADF' || String(err).includes('EBADF') || String(err).includes('bad file descriptor'))) {
            return;
        }
    });
}
`;

if (!content.includes('EBADF Windows GUI Stream Protector')) {
  content = ebadfGuard + '\n' + content;
}

// Ensure default BrowserWindow backgroundColor is #030712
content = content.replace(
  /backgroundColor:\s*options\.backgroundColor,/,
  "backgroundColor: options.backgroundColor || '#030712',"
);

// Prevent premature mainWindow.show() on Windows so it doesn't flash a blank white window
content = content.replace(
  /else if \(process\.platform === 'win32'\) \{\s*\n\s*\/\/ See other "Maximize window visual glitch on Windows fix" comment above\.\s*\n\s*mainWindow\.show\(\);\s*\n\s*\}/,
  `else if (process.platform === 'win32') {
        // mainWindow.show() deferred to after dark splash load to eliminate white flash
    }`
);

const startIdx = content.indexOf('    if (appArgs.targetUrl) {');
const endMarker = "electron_1.app.on('accessibility-support-changed'";
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find slice boundaries in main.js:', { startIdx, endIdx });
  process.exit(1);
}

const splashHtml = `data:text/html;charset=utf-8,` + encodeURIComponent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>InternalAPI</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #030712;
      color: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      user-select: none;
      overflow: hidden;
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 32px;
    }
    .icon-box {
      position: relative;
      width: 72px;
      height: 72px;
      border-radius: 18px;
      background: linear-gradient(135deg, rgba(249,115,22,0.18), rgba(234,88,12,0.06));
      border: 1px solid rgba(249,115,22,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
      box-shadow: 0 0 45px rgba(249,115,22,0.22);
    }
    .spinner {
      position: absolute;
      inset: -5px;
      border-radius: 23px;
      border: 2px solid transparent;
      border-top-color: #f97316;
      border-right-color: rgba(249,115,22,0.4);
      animation: spin 0.85s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .brand-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
      color: #ffffff;
    }
    .brand-title span {
      color: #f97316;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(17, 24, 39, 0.85);
      border: 1px solid #1f2937;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.35; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.2); box-shadow: 0 0 10px #10b981; }
    }
    .browser-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-top: 18px;
      padding: 7px 16px;
      border-radius: 8px;
      background: rgba(249, 115, 22, 0.12);
      border: 1px solid rgba(249, 115, 22, 0.35);
      color: #f97316;
      font-size: 11px;
      font-weight: 500;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .browser-btn:hover {
      background: rgba(249, 115, 22, 0.22);
      border-color: #f97316;
      color: #ffffff;
      transform: translateY(-1px);
    }
    .hint {
      margin-top: 16px;
      font-size: 11px;
      color: #6b7280;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">
      <div class="spinner"></div>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    </div>
    <div class="brand-title">Internal<span>API</span></div>
    <div class="status-badge">
      <div class="pulse-dot"></div>
      <span>Starting local service...</span>
    </div>
    <a href="http://127.0.0.1:39281/" target="_blank" class="browser-btn">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span>Open in Web Browser (http://127.0.0.1:39281)</span>
    </a>
    <div class="hint">Standalone Secure Environment</div>
  </div>
</body>
</html>`);

const newLoadBlock = `    if (appArgs.targetUrl) {
        const http = require('http');
        const path = require('path');
        const fs = require('fs');

        // Handle external link clicks (like "Open in Web Browser") to open system default browser
        try {
            mainWindow.webContents.setWindowOpenHandler(({ url }) => {
                require('electron').shell.openExternal(url);
                return { action: 'deny' };
            });
        } catch (_) {}

        // 1. Immediately render dark branded loading screen, and ONLY THEN show window (zero white screen!)
        try {
            mainWindow.setBackgroundColor('#030712');
            await mainWindow.loadURL("${splashHtml}");
            mainWindow.show();
        } catch (_) {
            try { mainWindow.show(); } catch (__) {}
        }

        const checkHttpReady = (port) => new Promise((resolve) => {
            const req = http.get({
                hostname: '127.0.0.1',
                port: port,
                path: '/health',
                timeout: 80,
            }, (res) => {
                res.resume();
                resolve(true);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });

        // 2. Start embedded standalone server right inside Electron's Node runtime
        const serverBundlePath = path.resolve(__dirname, '../server.bundle.js');
        if (fs.existsSync(serverBundlePath)) {
            try {
                const srv = require(serverBundlePath);
                if (typeof srv.startServer === 'function') {
                    srv.startServer(39281, '127.0.0.1').catch((err) => {
                        // ignore EADDRINUSE if server already started
                    });
                }
            } catch (srvErr) {}
        }

        // 3. Fast probe: check if port 39281 (or dev server 3000) is ready
        let is39281 = await checkHttpReady(39281);
        let is3000 = false;
        if (!is39281) {
            is3000 = await checkHttpReady(3000);
        }

        if (!is39281 && !is3000) {
            for (let i = 0; i < 20; i++) {
                await new Promise((r) => setTimeout(r, 40));
                is39281 = await checkHttpReady(39281);
                if (is39281) break;
                is3000 = await checkHttpReady(3000);
                if (is3000) break;
            }
        }

        // 4. Target URL: load from 127.0.0.1:39281 (or 3000 if dev server active)
        const targetUrl = is3000 ? 'http://127.0.0.1:3000/' : 'http://127.0.0.1:39281/';
        appArgs.targetUrl = targetUrl;

        // 5. Navigate to target URL
        try {
            await mainWindow.loadURL(targetUrl);
        } catch (err) {
            setTimeout(() => {
                mainWindow.loadURL(targetUrl).catch(() => {});
            }, 300);
        }
    }
}
`;

content = content.slice(0, startIdx) + newLoadBlock + content.slice(endIdx);
fs.writeFileSync(mainJsPath, content, 'utf8');
console.log('✓ Successfully patched main.js cleanly with embedded server, EBADF protection, and zero white screen!');
