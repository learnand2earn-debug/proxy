Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Building WebsiteSpark AI Proxy Intelligence Desktop App  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Generate icons
Write-Host "`n[1/3] Generating High-Resolution Application Icons..." -ForegroundColor Yellow
node scripts/create_icon.js

# 2. Compile Next.js desktop engine
Write-Host "`n[2/3] Compiling Production Next.js Engine..." -ForegroundColor Yellow
$env:NEXT_DIST_DIR = ".next-desktop"
npx next build

# 3. Build Windows Executable & NSIS Installer
Write-Host "`n[3/3] Packaging Windows .exe and Setup Installer..." -ForegroundColor Yellow
npx electron-builder --win

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " BUILD COMPLETE! Check 'dist-software/' for your .exe!   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
