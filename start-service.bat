@echo off
setlocal
cd /d "%~dp0"
echo Checking InternalAPI service...
netstat -aon | findstr ":3001.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo InternalAPI background service is already running on port 3001.
) else (
    echo Starting InternalAPI background service instantly...
    wscript "%~dp0start-service.vbs"
    echo InternalAPI background service running on http://localhost:3001
)
timeout /t 1 /nobreak >nul
