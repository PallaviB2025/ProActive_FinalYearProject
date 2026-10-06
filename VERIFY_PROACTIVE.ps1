$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$runtime = Join-Path $project '.runtime'
$nodeDir = Join-Path $runtime 'node-v24.21.0-win-x64'
$env:PATH = $nodeDir + ';' + $env:PATH
$env:npm_config_cache = Join-Path $runtime 'npm-cache'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $runtime 'browsers'
Push-Location $project
try {
  & (Join-Path $project 'STOP_PROACTIVE.ps1')
  & (Join-Path $project 'scripts\setup-db.ps1')
  foreach ($command in @('npm.cmd run lint','npm.cmd run typecheck','npm.cmd test','npm.cmd run test:integration','npm.cmd run build')) {
    Write-Output "Running: $command"
    & cmd.exe /d /s /c $command
    if ($LASTEXITCODE -ne 0) { throw "Verification failed: $command" }
  }
  & (Join-Path $project 'START_PROACTIVE.ps1')
  npm.cmd run test:e2e
  if ($LASTEXITCODE -ne 0) { throw 'Browser verification failed.' }
} finally { Pop-Location }
Write-Output 'All ProActive verification gates passed.'
