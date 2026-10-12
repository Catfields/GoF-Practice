param(
  [string]$Action = 'toggle'
)

# 一键启停脚本：start / stop / toggle（默认）
# 用法：.\server.ps1 start | stop | toggle

$ErrorActionPreference = 'Stop'
$PORT = 3000
$Root = $PSScriptRoot
$Server = Join-Path $Root 'server.js'

function Get-ServerProcess {
  $conn = Get-NetTCPConnection -LocalPort $PORT -State Listen -ErrorAction SilentlyContinue
  if ($conn) {
    $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.Name -eq 'node') { return $proc }
  }
  return $null
}

$existing = Get-ServerProcess
$running = $null -ne $existing

if ($Action -eq 'stop' -or ($Action -eq 'toggle' -and $running)) {
  if ($running) {
    Stop-Process -Id $existing.Id -Force
    Write-Host "[设计模式刷题平台] 已停止服务 (PID $($existing.Id))" -ForegroundColor Green
  } else {
    Write-Host "[设计模式刷题平台] 服务当前未运行" -ForegroundColor Yellow
  }
  return
}

if ($Action -eq 'start' -or ($Action -eq 'toggle' -and -not $running)) {
  if ($running) {
    Write-Host "[设计模式刷题平台] 服务已在运行 (PID $($existing.Id))：http://localhost:$PORT" -ForegroundColor Yellow
    return
  }
  if (-not (Test-Path -LiteralPath $Server)) {
    Write-Host "[错误] 找不到服务文件：$Server" -ForegroundColor Red
    exit 1
  }
  Start-Process -FilePath 'node' -ArgumentList "`"$Server`"" -WorkingDirectory $Root -WindowStyle Normal
  Write-Host "[设计模式刷题平台] 服务启动中，请在浏览器访问 http://localhost:$PORT" -ForegroundColor Cyan
  Write-Host "[设计模式刷题平台] 如需停止，再次运行本脚本即可（或在新开的窗口中按 Ctrl+C）" -ForegroundColor DarkGray
  return
}

Write-Host "用法：.\server.ps1 start | stop | toggle" -ForegroundColor Gray