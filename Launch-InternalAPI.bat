@echo off
setlocal
cd /d "%~dp0"

:: 1. Check if backend is already listening on 3001 or 3000
netstat -aon | findstr ":3001.*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    netstat -aon | findstr ":3000.*LISTENING" >nul 2>&1
    if %errorlevel% neq 0 (
        echo Starting InternalAPI background service on port 3001...
        powershell.exe -WindowStyle Hidden -Command "Start-Process -FilePath 'node' -ArgumentList 'packages/server/dist/index.js' -WorkingDirectory '%cd%' -WindowStyle Hidden"
        timeout /t 2 /nobreak >nul
    )
)

:: 2. Launch Desktop App
start "" "%~dp0InternalAPI-win32-x64\InternalAPI.exe"
exit
