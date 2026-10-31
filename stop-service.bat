@echo off
setlocal
echo Stopping InternalAPI background service on port 39281...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":39281.*LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":39281"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo InternalAPI background service stopped.
pause