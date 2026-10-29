@echo off
echo Stopping InternalAPI background service on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo InternalAPI background service stopped.
pause
