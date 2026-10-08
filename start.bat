@echo off
TITLE AcxiomCRM Enterprise Launcher
COLOR 0B

:: Ensure working directory is always the folder where start.bat resides
cd /d "%~dp0"

echo ================================================================
echo                    ACXIOMCRM ENTERPRISE
echo       Customer, Lead, Opportunity & Sales Lifecycle CRM
echo ================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH!
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check and install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [SETUP] Installing project dependencies (npm install)...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo [SETUP] Dependencies installed successfully!
    echo.
)

:: 3. Ensure database seed and migrations are ready
if not exist "data\acxiomcrm.db" (
    echo [SETUP] Initializing database and running schema migrations...
    node src\database\seed.js
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Database initialization failed.
        pause
        exit /b 1
    )
    echo [SETUP] Database initialized successfully!
    echo.
)

:: 4. Check if AcxiomCRM is already running on port 3000
netstat -ano | findstr LISTENING | findstr :3000 >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] AcxiomCRM server is ALREADY ACTIVE on http://localhost:3000
    echo [BROWSER] Launching web browser to http://localhost:3000/login ...
    start "" explorer "http://localhost:3000/login"
    echo.
    echo ================================================================
    echo AcxiomCRM is running. You can access it in your browser:
    echo 🌐 Web UI: http://localhost:3000/login
    echo.
    echo Press any key when you want to exit this launcher window.
    echo ================================================================
    pause
    exit /b 0
)

:: 5. Start the application and launch browser
echo [SERVER] Starting AcxiomCRM on http://localhost:3000 ...
echo [BROWSER] Launching default web browser...

:: Open browser after 2 seconds delay in background
start "" cmd /c "timeout /t 2 /nobreak >nul & explorer http://localhost:3000/login"

echo [READY] Server is active. Press Ctrl+C in this window to stop.
echo ================================================================
echo.
node src\server.js

echo.
echo ================================================================
echo [INFO] Server process has stopped.
echo ================================================================
pause
