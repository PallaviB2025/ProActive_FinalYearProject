$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$runtime = Join-Path $project '.runtime'
$nodeFolder = 'node-v24.21.0-win-x64'
$nodeDir = Join-Path $runtime $nodeFolder
$pgsqlDir = Join-Path $runtime 'pgsql'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
foreach ($port in @(3000,4000)) {
  if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) { throw 'Stop the app before setup replaces dependencies or builds.' }
}

function Find-FirstPath([string[]]$Candidates) {
  foreach ($candidate in $Candidates) { if (Test-Path -LiteralPath $candidate) { return (Resolve-Path -LiteralPath $candidate).Path } }
  return $null
}

if (!(Test-Path (Join-Path $nodeDir 'node.exe'))) {
  $source = Find-FirstPath @((Join-Path $project ".tools\$nodeFolder"), (Join-Path (Split-Path $project -Parent) ".tools\$nodeFolder"))
  if ($source) { Copy-Item -LiteralPath $source -Destination $nodeDir -Recurse }
  else {
    $archive = Find-FirstPath @((Join-Path $project '.tools\node.zip'), (Join-Path (Split-Path $project -Parent) '.tools\node.zip'))
    if (!$archive) { throw 'Bundled Node.js was not found. Place node.zip in .tools beside this script, then rerun setup.' }
    Expand-Archive -LiteralPath $archive -DestinationPath $runtime -Force
  }
}
if (!(Test-Path (Join-Path $pgsqlDir 'bin\postgres.exe'))) {
  $archive = Find-FirstPath @((Join-Path $project '.tools\postgres.zip'), (Join-Path (Split-Path $project -Parent) '.tools\postgres.zip'))
  if (!$archive) { throw 'Bundled PostgreSQL was not found. Place postgres.zip in .tools beside this script, then rerun setup.' }
  Expand-Archive -LiteralPath $archive -DestinationPath $runtime -Force
}

$env:PATH = $nodeDir + ';' + $env:PATH
& (Join-Path $nodeDir 'npm.cmd') --version
if ($LASTEXITCODE -ne 0) { throw 'Bundled npm is incomplete. Use a complete trusted Node distribution; node.exe alone is insufficient.' }
$env:npm_config_cache = Join-Path $runtime 'npm-cache'
$env:NEXT_TELEMETRY_DISABLED = '1'
Push-Location $project
try {
  npm.cmd ci
  if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
  & (Join-Path $project 'scripts\setup-db.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Database setup failed.' }
  npm.cmd run db:migrate
  if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
  $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $runtime 'browsers'
  npx.cmd playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw 'Browser installation failed.' }
} finally { Pop-Location }
Write-Output 'ProActive setup complete. Run .\START_PROACTIVE.ps1'
