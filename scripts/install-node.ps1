$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$runtime = Join-Path $project '.runtime'
if (!(Test-Path $runtime)) {
    New-Item -ItemType Directory -Force -Path $runtime | Out-Null
}

$zipPath = Join-Path $runtime 'node-v24.21.0-win-x64.zip'
$nodeDir = Join-Path $runtime 'node-v24.21.0-win-x64'
$nodeExe = Join-Path $nodeDir 'node.exe'

if (!(Test-Path $nodeExe)) {
    if (!(Test-Path $zipPath)) {
        Write-Host "Downloading Node.js v24.21.0 from nodejs.org..."
        & curl.exe -L -o $zipPath https://nodejs.org/dist/v24.21.0/node-v24.21.0-win-x64.zip
    }
    Write-Host "Extracting Node.js into .runtime..."
    Expand-Archive -LiteralPath $zipPath -DestinationPath $runtime -Force
}

if (Test-Path $nodeExe) {
    Write-Host "Node.js successfully installed!"
    & $nodeExe --version
    & (Join-Path $nodeDir 'npm.cmd') --version

    # Add to current process PATH
    $env:PATH = $nodeDir + ';' + $env:PATH

    # Add to User PATH if not already present
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$nodeDir*") {
        [Environment]::SetEnvironmentVariable("Path", "$nodeDir;$userPath", "User")
        Write-Host "Added $nodeDir to User PATH."
    }
} else {
    throw "node.exe not found at $nodeExe"
}
