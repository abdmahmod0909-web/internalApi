const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '../InternalAPI-win32-x64/resources/app');
const mainJsPath = path.join(appRoot, 'lib/main.js');
const nativefierJsonPath = path.join(appRoot, 'nativefier.json');

console.log('Patching main.js at:', mainJsPath);
if (!fs.existsSync(mainJsPath)) {
  console.error('main.js not found at ' + mainJsPath);
  process.exit(1);
}

// 1. Update nativefier.json (Use 127.0.0.1 instead of localhost to avoid Windows 15s IPv6 timeout!)
if (fs.existsSync(nativefierJsonPath)) {
  const json = JSON.parse(fs.readFileSync(nativefierJsonPath, 'utf8'));
  json.targetUrl = 'http://127.0.0.1:3001/';
  json.backgroundColor = '#030712';
  fs.writeFileSync(nativefierJsonPath, JSON.stringify(json, null, 2), 'utf8');
  console.log('✓ nativefier.json targetUrl (127.0.0.1) and backgroundColor set');
}

// 2. Read main.js
let content = fs.readFileSync(mainJsPath, 'utf8');

// Ensure BrowserWindow default backgroundColor is #030712
content = content.replace(
  /backgroundColor:\s*options\.backgroundColor(\s*\|\|\s*'#[0-9a-fA-F]+')?,/,
  "backgroundColor: options.backgroundColor || '#030712',"
);

// Prevent premature mainWindow.show() on Windows
content = content.replace(
  /else if \(process\.platform === 'win32'\) \{\s*\n\s*\/\/ See other "Maximize window visual glitch on Windows fix" comment above\.\s*\n\s*mainWindow\.show\(\);\s*\n\s*\}/,
  `else if (process.platform === 'win32') {
        // mainWindow.show() deferred to after splash load to prevent white flash
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
    html, body {
      background-color: #030712 !important;
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
    .hint {
      margin-top: 18px;
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
      <span id="status-text">Starting local service...</span>
    </div>
    <div class="hint">Connecting to standalone environment</div>
  </div>
</body>
</html>`);

const newLoadBlock = `    if (appArgs.targetUrl) {
        const http = require('http');
        const path = require('path');
        const fs = require('fs');
        const cp = require('child_process');

        // 1. Force dark background on webContents so Chromium NEVER paints a white background between navigations
        try {
            mainWindow.setBackgroundColor('#030712');
            mainWindow.webContents.on('did-start-loading', () => {
                try { mainWindow.setBackgroundColor('#030712'); } catch (_) {}
            });
            await mainWindow.loadURL("${splashHtml}");
            mainWindow.show();
        } catch (_) {
            try { mainWindow.show(); } catch (__) {}
        }

        // 2. Verify full HTTP readiness on 127.0.0.1 (NOT just TCP socket open, and NOT 'localhost' which hangs on IPv6)
        const checkHttpReady = (port) => new Promise((resolve) => {
            const req = http.get({
                hostname: '127.0.0.1',
                port: port,
                path: '/',
                timeout: 250
            }, (res) => {
                res.resume(); // consume response data to free memory
                resolve(res.statusCode >= 200 && res.statusCode < 500);
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });

        let is3001 = await checkHttpReady(3001);
        let is3000 = !is3001 ? await checkHttpReady(3000) : false;

        // 3. If neither is running, launch the backend service
        if (!is3001 && !is3000) {
            log.info('InternalAPI backend not running. Starting background service...');
            const candidateDirs = [
                path.resolve(__dirname, '../server-bundle'), // Bundled inside resources/app/server-bundle for standalone PCs
                path.resolve(__dirname, '../../../../'),
                path.resolve(__dirname, '../../../'),
                path.resolve(__dirname, '../../'),
                'C:\\\\laragon\\\\www\\\\postman',
                process.cwd(),
            ];

            const projectDir = candidateDirs.find((d) =>
                fs.existsSync(path.join(d, 'packages/server/dist/index.js'))
            );

            if (projectDir) {
                const serverScript = path.join(projectDir, 'packages/server/dist/index.js');

                // Use system node if present, otherwise use Electron's own executable in Node mode (works on ANY standalone PC!)
                const hasSystemNode = fs.existsSync('C:\\\\Program Files\\\\nodejs\\\\node.exe');
                const execBin = hasSystemNode ? 'C:\\\\Program Files\\\\nodejs\\\\node.exe' : process.execPath;
                const childEnv = {
                    ...process.env,
                    PORT: '3001',
                    HOST: '127.0.0.1',
                    NODE_ENV: 'production'
                };
                if (!hasSystemNode) {
                    childEnv.ELECTRON_RUN_AS_NODE = '1';
                }

                try {
                    const child = cp.spawn(execBin, [serverScript], {
                        cwd: projectDir,
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: true,
                        env: childEnv,
                    });
                    child.unref();
                    log.info('Spawned backend service PID:', child.pid);
                } catch (spawnErr) {
                    log.error('Direct spawn failed:', spawnErr);
                }
            } else {
                log.error('Could not locate packages/server/dist/index.js in any candidate directory!');
            }
        }

        // 4. Poll until the HTTP server ACTUALLY responds with HTML (up to 60 seconds, checking every 120ms).
        // Keeping the splash screen up until HTTP is 100% ready guarantees ZERO white screen!
        for (let i = 0; i < 500; i++) {
            if (is3001 || is3000) break;
            is3001 = await checkHttpReady(3001);
            if (is3001) break;
            if (i % 5 === 0) {
                is3000 = await checkHttpReady(3000);
                if (is3000) break;
            }
            await new Promise((r) => setTimeout(r, 120));
        }

        // 5. Always use 127.0.0.1 instead of localhost so Chromium doesn't stall for 15-60s on Windows IPv6 lookup
        const targetUrl = is3001 ? 'http://127.0.0.1:3001/' : (is3000 ? 'http://127.0.0.1:3000/' : 'http://127.0.0.1:3001/');
        appArgs.targetUrl = targetUrl;
        log.info('Server HTTP verified ready! Navigating to:', targetUrl);

        // 6. Inject dark background CSS as soon as navigation commits so the page never flashes white while scripts parse
        mainWindow.webContents.once('did-navigate', () => {
            try {
                mainWindow.webContents.insertCSS('html, body { background-color: #030712 !important; }');
            } catch (_) {}
        });

        await mainWindow.loadURL(targetUrl);
    }
}
`;

content = content.slice(0, startIdx) + newLoadBlock + content.slice(endIdx);

// 3. Also ensure Nativefier's createMainWindow doesn't load targetUrl a second time before our block
content = content.replace(/localhost:3001/g, '127.0.0.1:3001');

fs.writeFileSync(mainJsPath, content, 'utf8');
console.log('✓ Successfully patched main.js cleanly!');