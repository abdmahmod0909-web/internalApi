@echo off
setlocal
cd /d "%~dp0"
echo Checking InternalAPI service...
netstat -aon | findstr ":3001.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo InternalAPI background service is already running on port 3001.
) else (
    echo Starting InternalAPI background service...
    powershell.exe -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'packages/server/dist/index.js' -WorkingDirectory '%cd%' -WindowStyle Hidden"
    echo InternalAPI background service started in background on http://localhost:3001
)
timeout /t 2 /nobreak >nul

