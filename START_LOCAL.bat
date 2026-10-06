@echo off
title ProActive Local Server
cd /d "%~dp0"
echo ===================================================
echo   Starting ProActive Security Desk (API + Web)
echo ===================================================
set "PATH=%~dp0.runtime\node-v24.21.0-win-x64;%PATH%"
node scripts/dev.mjs
