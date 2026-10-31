@echo off
setlocal
cd /d "%~dp0"

:: 1. Check if backend is already listening on 39281 or 3000
netstat -aon | findstr ":39281.*LISTENING" >nul 2>&1
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
    echo Desktop binary not in default folder. Starting browser at http://127.0.0.1:39281 ...
    start http://127.0.0.1:39281/
)
exit