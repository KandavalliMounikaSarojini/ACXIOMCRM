# AcxiomCRM Enterprise PowerShell Launcher
$ErrorActionPreference = "Stop"

# Set working directory to script folder
Set-Location $PSScriptRoot

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "                   ACXIOMCRM ENTERPRISE" -ForegroundColor White
Write-Host "      Customer, Lead, Opportunity & Sales Lifecycle CRM" -ForegroundColor Gray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not found in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js (v18 or higher) from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    exit 1
}

# 2. Check dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[SETUP] Installing project dependencies (npm install)..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "[SETUP] Dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
}

# 3. Check Database
if (-not (Test-Path "data/acxiomcrm.db")) {
    Write-Host "[SETUP] Initializing database and running schema migrations..." -ForegroundColor Yellow
    node src/database/seed.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Database seeding failed." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "[SETUP] Database initialized successfully!" -ForegroundColor Green
    Write-Host ""
}

Write-Host "[SERVER] Starting AcxiomCRM on http://localhost:3000 ..." -ForegroundColor Green
Write-Host "[BROWSER] Launching default web browser..." -ForegroundColor Cyan

# Open browser asynchronously
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000/login"
} | Out-Null

Write-Host "[READY] Server is active. Press Ctrl+C to stop." -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

node src/server.js
