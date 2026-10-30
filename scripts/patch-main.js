const fs = require('fs');
const path = require('path');

const mainJsPath = path.resolve(__dirname, '../InternalAPI-win32-x64/resources/app/lib/main.js');
const nativefierJsonPath = path.resolve(__dirname, '../InternalAPI-win32-x64/resources/app/nativefier.json');

console.log('Patching main.js at:', mainJsPath);
if (!fs.existsSync(mainJsPath)) {
  console.error('main.js not found at ' + mainJsPath);
  process.exit(1);
}

// 1. Update nativefier.json targetUrl to http://localhost:3001/
if (fs.existsSync(nativefierJsonPath)) {
  const json = JSON.parse(fs.readFileSync(nativefierJsonPath, 'utf8'));
  json.targetUrl = 'http://localhost:3001/';
  fs.writeFileSync(nativefierJsonPath, JSON.stringify(json, null, 2), 'utf8');
  console.log('✓ nativefier.json targetUrl updated to http://localhost:3001/');
}

// 2. Read and patch main.js
let content = fs.readFileSync(mainJsPath, 'utf8');

const regex = /if\s*\(\s*appArgs\.targetUrl\s*\)\s*\{\s*await\s+mainWindow\.loadURL\(appArgs\.targetUrl\);\s*\}/;

const replacementCode = `if (appArgs.targetUrl) {
        const net = require('net');
        const path = require('path');
        const fs = require('fs');
        const cp = require('child_process');

        const checkPort = (port) => new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(350);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(port, '127.0.0.1');
        });

        // 1. Check if dev server (3000) or background server (3001) is already running
        let is3000 = await checkPort(3000);
        let is3001 = await checkPort(3001);

        // 2. If neither is running, launch the backend service silently in background
        if (!is3000 && !is3001) {
            log.info('InternalAPI backend not detected. Launching background service...');
            const candidateDirs = [
                'C:\\\\laragon\\\\www\\\\postman',
                path.resolve(__dirname, '../../../../'),
                path.resolve(__dirname, '../../../'),
                path.resolve(__dirname, '../../'),
                process.cwd(),
            ];

            const projectDir = candidateDirs.find((d) =>
                fs.existsSync(path.join(d, 'packages/server/dist/index.js'))
            );

            if (projectDir) {
                const serverScript = path.join(projectDir, 'packages/server/dist/index.js');
                const nodeExe = fs.existsSync('C:\\\\Program Files\\\\nodejs\\\\node.exe')
                    ? 'C:\\\\Program Files\\\\nodejs\\\\node.exe'
                    : 'node';

                try {
                    // Spawn completely silent and detached background process
                    const child = cp.spawn(nodeExe, [serverScript], {
                        cwd: projectDir,
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: true,
                    });
                    child.unref();
                    log.info('Spawned backend service PID:', child.pid);
                } catch (spawnErr) {
                    log.error('Failed to spawn backend service with node:', spawnErr);
                    // Fallback to powershell hidden
                    try {
                        cp.spawn('powershell.exe', [
                            '-WindowStyle', 'Hidden',
                            '-Command',
                            \`Start-Process -FilePath "node" -ArgumentList "\${serverScript}" -WorkingDirectory "\${projectDir}" -WindowStyle Hidden\`
                        ], { detached: true, stdio: 'ignore' }).unref();
                    } catch (psErr) {
                        log.error('Failed to spawn with powershell:', psErr);
                    }
                }
            }
        }

        // 3. Wait for port 3000 or 3001 to become ready (up to 7 seconds)
        for (let i = 0; i < 35; i++) {
            is3000 = await checkPort(3000);
            if (is3000) break;
            is3001 = await checkPort(3001);
            if (is3001) break;
            await new Promise((r) => setTimeout(r, 200));
        }

        // 4. Prefer 3000 if dev server running, otherwise 3001
        const targetUrl = is3000 ? 'http://localhost:3000/' : 'http://localhost:3001/';
        appArgs.targetUrl = targetUrl;
        log.info('Final targetUrl determined:', targetUrl);

        // 5. Load URL with auto-retry and friendly loading screen instead of white blank screen
        const loadWithRetry = async (attemptsLeft = 12) => {
            try {
                await mainWindow.loadURL(targetUrl);
            } catch (err) {
                log.warn('mainWindow.loadURL failed, retrying...', err);
                if (attemptsLeft > 0) {
                    // Show a graceful loading screen while waiting for the service
                    try {
                        await mainWindow.loadURL(\`data:text/html;charset=utf-8,\${encodeURIComponent(\`
                            <html>
                            <head><title>InternalAPI - Connecting...</title></head>
                            <body style="background:#030712;color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
                                <div style="display:flex;align-items:center;margin-bottom:16px;">
                                    <div style="width:12px;height:12px;background:#f97316;border-radius:50%;margin-right:10px;animation:pulse 1.2s infinite ease-in-out;"></div>
                                    <h2 style="margin:0;font-size:18px;color:#f97316;font-weight:600;">Starting InternalAPI Service...</h2>
                                </div>
                                <p style="color:#9ca3af;font-size:12px;margin:0 0 16px 0;">Connecting to \${targetUrl}</p>
                                <button onclick="location.reload()" style="background:#f97316;color:white;border:none;padding:7px 16px;border-radius:4px;font-size:12px;font-weight:500;cursor:pointer;">Retry</button>
                                <style>@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }</style>
                                <script>setTimeout(function(){ location.reload(); }, 1200);</script>
                            </body>
                            </html>
                        \`)}\`);
                    } catch (_) {}
                    setTimeout(() => loadWithRetry(attemptsLeft - 1), 1000);
                }
            }
        };

        await loadWithRetry();
    }`;

if (regex.test(content)) {
  content = content.replace(regex, replacementCode);
  fs.writeFileSync(mainJsPath, content, 'utf8');
  console.log('✓ Successfully patched main.js with auto-start, ready check, and retry logic!');
} else {
  console.log('Checking if main.js was already patched...');
  if (content.includes('checkPort')) {
    console.log('✓ main.js is already patched with checkPort logic.');
  } else {
    console.error('Could not locate loadURL block in main.js to patch.');
    process.exit(1);
  }
}
