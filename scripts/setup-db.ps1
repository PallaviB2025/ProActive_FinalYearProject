$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $project '.runtime'
$bin = Join-Path $runtime 'pgsql/bin'
$data = Join-Path $runtime 'pgdata'
$envFile = Join-Path $project '.env'
if (!(Test-Path (Join-Path $data 'PG_VERSION'))) {
 if (Test-Path $envFile) { throw 'Existing .env found. Refusing to replace database configuration.' }
 $random = New-Object byte[] 32
 $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
 $rng.GetBytes($random)
 $rng.Dispose()
 $password = [BitConverter]::ToString($random).Replace('-','').ToLowerInvariant()
 $passwordFile = Join-Path $runtime 'init-password'
 [IO.File]::WriteAllText($passwordFile,$password)
 try {
  & "$bin/initdb.exe" -D $data -U proactive --pwfile=$passwordFile --auth=scram-sha-256 --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
 } finally { Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue }
 [IO.File]::AppendAllText((Join-Path $data 'postgresql.conf'),"`nlisten_addresses = '127.0.0.1'`nport = 55433`nlogging_collector = off`nlog_statement = 'none'`nlog_min_error_statement = 'panic'`n")
 [IO.File]::WriteAllText($envFile,"DATABASE_URL=postgresql://proactive:$password@127.0.0.1:55433/proactive`nTEST_DATABASE_URL=postgresql://proactive:$password@127.0.0.1:55433/proactive_test`nAPP_ORIGIN=http://localhost:3000`nPORT=4000`n")
}
& "$bin/pg_isready.exe" -h 127.0.0.1 -p 55433 -q
if ($LASTEXITCODE -ne 0) {
 & "$bin/pg_ctl.exe" start -D $data -l (Join-Path $runtime 'postgres.log') -w
 if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL start failed' }
}
$config = Get-Content $envFile
$dbUrl = ($config | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=',''
$parsed = [Uri]$dbUrl
$env:PGPASSWORD = ($parsed.UserInfo -split ':',2)[1]
try {
 foreach ($name in @('proactive','proactive_test')) {
  $exists = & "$bin/psql.exe" -h 127.0.0.1 -p 55433 -U proactive -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$name'"
  if ($LASTEXITCODE -ne 0) { throw 'Database connection failed; no database will be created.' }
  if ($exists -ne '1') {
   & "$bin/createdb.exe" -h 127.0.0.1 -p 55433 -U proactive $name
   if ($LASTEXITCODE -ne 0) { throw 'Database creation failed' }
  }
 }
} finally { Remove-Item Env:PGPASSWORD }
Write-Output 'Clean ProActive databases are ready on port 55433.'
