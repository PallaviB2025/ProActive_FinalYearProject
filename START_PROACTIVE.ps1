$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$runtime = Join-Path $project '.runtime'
$node = Join-Path $runtime 'node-v24.21.0-win-x64\node.exe'
$pgBin = Join-Path $runtime 'pgsql\bin'
$pgData = Join-Path $runtime 'pgdata'
foreach ($required in @($node, (Join-Path $project '.env'), (Join-Path $project 'apps\web\.next\BUILD_ID'), (Join-Path $project 'apps\api\dist\apps\api\src\server.js'))) {
  if (!(Test-Path -LiteralPath $required)) { throw "Missing setup artifact: $required. Run .\SETUP_PROACTIVE.ps1 first." }
}
foreach ($port in @(3000,4000)) {
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw "Port $port is already in use. Run .\STOP_PROACTIVE.ps1 or stop the conflicting application." }
}
if (Test-Path (Join-Path $pgBin 'pg_isready.exe')) {
  & (Join-Path $pgBin 'pg_isready.exe') -h 127.0.0.1 -p 55433 -q
  if ($LASTEXITCODE -ne 0) {
    & (Join-Path $pgBin 'pg_ctl.exe') start -D $pgData -l (Join-Path $runtime 'postgres.log') -w
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL failed to start.' }
  }
}
$env:NEXT_TELEMETRY_DISABLED = '1'
$api = Start-Process -FilePath $node -ArgumentList 'dist/apps/api/src/server.js' -WorkingDirectory (Join-Path $project 'apps\api') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'api.stdout.log') -RedirectStandardError (Join-Path $runtime 'api.stderr.log') -PassThru
$web = Start-Process -FilePath $node -ArgumentList '"../../node_modules/next/dist/bin/next" start -H 127.0.0.1 -p 3000' -WorkingDirectory (Join-Path $project 'apps\web') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'web.stdout.log') -RedirectStandardError (Join-Path $runtime 'web.stderr.log') -PassThru
@{ api = $api.Id; web = $web.Id; apiStarted = $api.StartTime.ToUniversalTime().ToString('o'); webStarted = $web.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtime 'app-pids.json')
$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  try {
    $health = Invoke-RestMethod 'http://127.0.0.1:4000/health' -TimeoutSec 5
    $page = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000' -TimeoutSec 5
    if ($health.ok -and $page.StatusCode -eq 200) { $ready = $true; break }
  } catch { Start-Sleep -Milliseconds 500 }
}
if (!$ready) { throw 'Runtime health check failed. Inspect .runtime logs, then run STOP_PROACTIVE.ps1.' }
Write-Output 'ProActive started: http://localhost:3000'
