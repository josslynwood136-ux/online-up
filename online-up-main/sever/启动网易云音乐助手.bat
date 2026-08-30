@echo off
chcp 65001 >nul
title 网易云音乐助手
cd /d "%~dp0"
if not exist node_modules (
  echo 首次运行，正在安装依赖，请稍候（只需一次）…
  call npm install
)
echo.
echo 正在启动网易云音乐助手…
echo 启动成功后请保持本窗口开启，关闭窗口即停止助手。
echo.
node server.js
pause
