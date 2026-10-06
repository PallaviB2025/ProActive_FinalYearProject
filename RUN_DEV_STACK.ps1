$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$runtime = Join-Path $project '.runtime'
$node = Join-Path $runtime 'node-v24.21.0-win-x64\node.exe'
$pgBin = Join-Path $runtime 'pgsql\bin'
$pgData = Join-Path $runtime 'pgdata'

& (Join-Path $pgBin 'pg_isready.exe') -h 127.0.0.1 -p 55433 -q
if ($LASTEXITCODE -ne 0) {
  & (Join-Path $pgBin 'pg_ctl.exe') start -D $pgData -l (Join-Path $runtime 'postgres.log') -w
}

$env:NEXT_TELEMETRY_DISABLED = '1'
$api = Start-Process -FilePath $node -ArgumentList 'dist/apps/api/src/server.js' -WorkingDirectory (Join-Path $project 'apps\api') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'api.stdout.log') -RedirectStandardError (Join-Path $runtime 'api.stderr.log') -PassThru
$web = Start-Process -FilePath $node -ArgumentList '"../../node_modules/next/dist/bin/next" start -H 127.0.0.1 -p 3000' -WorkingDirectory (Join-Path $project 'apps\web') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'web.stdout.log') -RedirectStandardError (Join-Path $runtime 'web.stderr.log') -PassThru

@{ api = $api.Id; web = $web.Id; apiStarted = $api.StartTime.ToUniversalTime().ToString('o'); webStarted = $web.StartTime.ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtime 'app-pids.json')

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $health = Invoke-RestMethod 'http://127.0.0.1:4000/health' -TimeoutSec 3
    $page = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000' -TimeoutSec 3
    if ($health.ok -and $page.StatusCode -eq 200) {
      Write-Output "ProActive stack ready on http://127.0.0.1:3000"
      break
    }
  } catch { Start-Sleep -Milliseconds 500 }
}

Wait-Process -Id $api.Id, $web.Id
