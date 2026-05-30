@echo off
setlocal

title Remote Coop Play - Windows EXE Builder
cd /d "%~dp0"

echo.
echo ============================================================
echo  Remote Coop Play - Windows EXE Builder
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js 20 LTS or newer is required on the build machine.
  echo Download it from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found.
  echo.
  pause
  exit /b 1
)

echo Installing app dependencies...
cd app
call npm install
if errorlevel 1 (
  echo.
  echo ERROR: npm install failed.
  pause
  exit /b 1
)

echo.
echo Building Windows installer and portable executable...
call npm run dist:win
if errorlevel 1 (
  echo.
  echo ERROR: Build failed.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  BUILD COMPLETE
echo ============================================================
echo.
echo Your client-ready files are in:
echo %~dp0app\dist
echo.
echo Give your client ONLY the .exe file from app\dist.
echo.
pause
