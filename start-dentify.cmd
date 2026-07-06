@echo off
setlocal
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%.tools\node-v24.16.0-win-x64"

if exist "%NODE_DIR%\npm.cmd" (
  set "PATH=%NODE_DIR%;%PATH%"
  "%NODE_DIR%\npm.cmd" run dev
  exit /b %ERRORLEVEL%
)

npm run dev
