@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo Setting up Playwright OpenCart AI
echo ========================================

if not exist "package.json" (
    echo ERROR: package.json not found!
    pause
    exit /b 1
)

echo.
echo [1/3] Installing dependencies...
call npm install dotenv @faker-js/faker luxon ajv csv-parse @axe-core/playwright allure-playwright mysql2
if errorlevel 1 goto :error

call npm install -D @types/node
if errorlevel 1 goto :error

echo.
echo [2/3] Installing Playwright browsers...
call npx playwright install
if errorlevel 1 goto :error

echo.
echo [3/3] Checking Playwright...
call npx playwright --version
if errorlevel 1 goto :error

echo.
echo Setup completed successfully!
pause
exit /b 0

:error
echo.
echo Setup failed. Check the error above.
pause
exit /b 1