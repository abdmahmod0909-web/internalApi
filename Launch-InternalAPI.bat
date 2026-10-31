@echo off
setlocal
cd /d "%~dp0"

:: 1. Check if backend is already listening on 3001 or 3000
netstat -aon | findstr ":3001.*LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    netstat -aon | findstr ":3000.*LISTENING" >nul 2>&1
    if %errorlevel% neq 0 (
        echo Starting InternalAPI background service...
        wscript "%~dp0start-service.vbs"
    )
)

:: 2. Launch Desktop App if directory exists
if exist "%~dp0InternalAPI-win32-x64\InternalAPI.exe" (
    start "" "%~dp0InternalAPI-win32-x64\InternalAPI.exe"
) else (
    echo Desktop binary not in default folder. Starting browser at http://localhost:3001 ...
    start http://localhost:3001/
)
exit