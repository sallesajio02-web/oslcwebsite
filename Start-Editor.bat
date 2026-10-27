@echo off
setlocal
title OSLC HTML Studio
pushd "%~dp0"
if errorlevel 1 goto failed

echo Starting OSLC HTML Studio...
echo Editor: http://127.0.0.1:5173/editor
echo.

where node.exe >nul 2>&1
if errorlevel 1 (
    echo Node.js is missing. Install Node.js, then run this file again.
    goto failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo npm is missing. Reinstall Node.js, then run this file again.
    goto failed
)

rem Reuse this project's editor when it is already running.
powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest 'http://127.0.0.1:5173/editor-preview.html' -UseBasicParsing -TimeoutSec 2; if ($response.Content.Contains('html-studio-load')) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 (
    echo The editor is already running. Opening your browser...
    start "" "http://127.0.0.1:5173/editor"
    popd
    exit /b 0
)

if not exist "node_modules\vite\bin\vite.js" (
    echo Dependencies are missing. Run npm.cmd install in this folder first.
    goto failed
)

echo Keep this window open while editing. Press Ctrl+C to stop the server.
echo.
call npm.cmd run editor
if errorlevel 1 goto failed
popd
exit /b 0

:failed
echo.
echo The editor could not start. Review the message above.
pause
popd
exit /b 1
