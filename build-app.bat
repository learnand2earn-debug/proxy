@echo off
title Building WebsiteSpark AI Proxy Intelligence Desktop Software
echo ==========================================================
echo  Building WebsiteSpark AI Proxy Intelligence Desktop App
echo ==========================================================
echo.
echo [1/3] Generating Icons...
node scripts/create_icon.js
echo.
echo [2/3] Building Next.js Desktop Engine...
set NEXT_DIST_DIR=.next-desktop
call npx next build
echo.
echo [3/3] Creating Windows Installer (.exe)...
call npx electron-builder --win
echo.
echo ==========================================================
echo  SUCCESS! Your installer is in 'dist-software' folder!
echo ==========================================================
pause
