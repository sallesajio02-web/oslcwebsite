@echo off
setlocal
title OSLC Website
pushd "%~dp0"
if errorlevel 1 exit /b 1

where node.exe >nul 2>&1
if errorlevel 1 (
    echo Node.js is missing. Install Node.js 22.12+ or 24, then try again.
    goto failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo npm is missing. Reinstall Node.js, then try again.
    goto failed
)

if not exist "node_modules\vite\bin\vite.js" (
    echo Installing project dependencies...
    call npm.cmd install
    if errorlevel 1 goto failed
)

if not exist ".env" (
    echo Missing .env. Follow the database setup in README.md, then try again.
    goto failed
)

rem Restart the isolated development database only when it already exists.
if exist ".local\postgres\PG_VERSION" (
    echo Starting the local PostgreSQL database...
    call npm.cmd run db:local
    if errorlevel 1 goto failed
)

echo.
echo Starting OSLC Website and API...
echo Website: http://localhost:5173
echo Admin:   http://localhost:5173/admin
echo Keep this window open. Press Ctrl+C to stop the project.
echo.
call npm.cmd run dev
if errorlevel 1 goto failed
popd
exit /b 0

:failed
echo.
echo The project could not start. Review the message above.
pause
popd
exit /b 1
