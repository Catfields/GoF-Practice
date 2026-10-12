@echo off
rem 一键启停：双击即可启动/停止服务（已运行则停止，未运行则启动）
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" %*
echo.
pause