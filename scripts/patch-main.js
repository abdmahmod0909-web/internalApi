const fs = require('fs');
const path = require('path');

const mainJsPath = path.resolve(__dirname, '../InternalAPI-win32-x64/resources/app/lib/main.js');
const nativefierJsonPath = path.resolve(__dirname, '../InternalAPI-win32-x64/resources/app/nativefier.json');

console.log('Patching main.js at:', mainJsPath);
if (!fs.existsSync(mainJsPath)) {
  console.error('main.js not found!');
  process.exit(1);
}

// 1. Update nativefier.json targetUrl to 3001
if (fs.existsSync(nativefierJsonPath)) {
  const json = JSON.parse(fs.readFileSync(nativefierJsonPath, 'utf8'));
  json.targetUrl = 'http://localhost:3001/';
  fs.writeFileSync(nativefierJsonPath, JSON.stringify(json, null, 2), 'utf8');
  console.log('nativefier.json targetUrl set to http://localhost:3001/');
}

let content = fs.readFileSync(mainJsPath, 'utf8');

// Replace the loadURL block in onReady
const oldLoadBlock = `    if (appArgs.targetUrl) {
        await mainWindow.loadURL(appArgs.targetUrl);
    }`;

const newLoadBlock = `    if (appArgs.targetUrl) {
        const net = require('net');
        const checkReady = (port) => new Promise((resolve) => {
            const s = net.createConnection(port, '127.0.0.1');
            s.on('connect', () => { s.destroy(); resolve(true); });
            s.on('error', () => { s.destroy(); resolve(false); });
        });

        // Ensure background service is launched if neither 3000 nor 3001 is listening
        const is3000Ready = await checkReady(3000);
        const is3001Ready = await checkReady(3001);
        if (!is3000Ready && !is3001Ready) {
            const cp = require('child_process');
            const projectDir = 'C:\\\\laragon\\\\www\\\\postman';
            const serverScript = require('path').join(projectDir, 'packages/server/dist/index.js');
            if (require('fs').existsSync(serverScript)) {
                cp.spawn('powershell.exe', [
                    '-WindowStyle', 'Hidden',
                    '-Command',
                    'Start-Process -FilePath "node" -ArgumentList "packages/server/dist/index.js" -WorkingDirectory "' + projectDir + '" -WindowStyle Hidden'
                ], { detached: true, stdio: 'ignore' });
            }
        }

        // Wait up to 5 seconds for either port to be listening
        for (let i = 0; i < 25; i++) {
            if (await checkReady(3000) || await checkReady(3001)) break;
            await new Promise((r) => setTimeout(r, 200));
        }

        // Prefer 3000 if dev server is running, otherwise 3001
        if (await checkReady(3000)) {
            appArgs.targetUrl = 'http://localhost:3000/';
        } else {
            appArgs.targetUrl = 'http://localhost:3001/';
        }

        try {
            await mainWindow.loadURL(appArgs.targetUrl);
        } catch (e) {
            setTimeout(() => {
                mainWindow.loadURL(appArgs.targetUrl).catch(() => {});
            }, 1000);
        }
    }`;

if (content.includes(oldLoadBlock)) {
  content = content.replace(oldLoadBlock, newLoadBlock);
  fs.writeFileSync(mainJsPath, content, 'utf8');
  console.log('Successfully replaced loadURL with auto-start and ready-check logic!');
} else {
  console.log('loadURL block was already modified or not found.');
}
