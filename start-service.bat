@echo off
setlocal
cd /d "%~dp0"
echo Checking InternalAPI service...
netstat -aon | findstr ":39281.*LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo InternalAPI background service is already running on port 39281.
) else (
    echo Starting InternalAPI background service instantly...
    wscript "%~dp0start-service.vbs"
    echo InternalAPI background service running on http://127.0.0.1:39281
)
timeout /t 1 /nobreak >nul