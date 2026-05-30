$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================"
Write-Host " Remote Coop Play - Windows EXE Builder"
Write-Host "============================================================"
Write-Host ""

Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js 20 LTS or newer is required on the build machine."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found."
}

Write-Host "Installing app dependencies..."
Set-Location "$PSScriptRoot\app"
npm install

Write-Host ""
Write-Host "Building Windows installer and portable executable..."
npm run dist:win

Write-Host ""
Write-Host "============================================================"
Write-Host " BUILD COMPLETE"
Write-Host "============================================================"
Write-Host ""
Write-Host "Client-ready files are in:"
Write-Host "$PSScriptRoot\app\dist"
Write-Host ""
Write-Host "Give your client ONLY the .exe file from app\dist."
