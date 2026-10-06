$ErrorActionPreference = 'Stop'
# Compatibility entry point; keep one authoritative launcher.
& (Join-Path (Split-Path $PSScriptRoot -Parent) 'START_PROACTIVE.ps1')
