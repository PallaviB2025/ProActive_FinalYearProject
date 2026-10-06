$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$runtime = Join-Path $project '.runtime'
$pidFile = Join-Path $runtime 'app-pids.json'
if (Test-Path -LiteralPath $pidFile) {
  $saved = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
  foreach ($role in @('web', 'api')) {
    $processId = $saved.$role
    $running = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if (!$running) { continue }
    $expectedNode = [IO.Path]::GetFullPath((Join-Path $runtime 'node-v24.21.0-win-x64\node.exe'))
    $started = $saved.($role + 'Started')
    if (!$started -or $running.Path -ne $expectedNode -or $running.StartTime.ToUniversalTime().ToString('o') -ne $started) {
      throw "Refusing to stop unverified or reused PID $processId. Verify the old process manually."
    }
    Stop-Process -Id $processId -Force -ErrorAction Stop
  }
  Remove-Item -LiteralPath $pidFile -Force
}
$pgBin = Join-Path $runtime 'pgsql\bin'
$pgData = Join-Path $runtime 'pgdata'
if ((Test-Path (Join-Path $pgBin 'pg_isready.exe')) -and (Test-Path $pgData)) {
  & (Join-Path $pgBin 'pg_isready.exe') -h 127.0.0.1 -p 55433 -q
  if ($LASTEXITCODE -eq 0) {
    & (Join-Path $pgBin 'pg_ctl.exe') stop -D $pgData -m fast -w
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not stop.' }
  }
}
Write-Output 'ProActive stopped.'
