@echo off
chcp 65001 >nul
title TypeThin

echo Starting TypeThin...

cd /d "%~dp0"

if exist "node_modules\electron\cli.js" (
    "C:\Program Files\nodejs\node.exe" "node_modules\electron\cli.js" .
) else (
    echo Error: electron not found. Please run: npm install
    pause
)