<#
.SYNOPSIS
    Stop Engenox local development stack
.DESCRIPTION
    Shuts down all services defined in docker-compose.dev.yml
#>

param(
    [switch]$Volumes,
    [switch]$RemoveOrphans
)

$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ROOT_DIR = Split-Path -Parent $SCRIPT_DIR
$COMPOSE_FILE = Join-Path $ROOT_DIR "docker-compose.dev.yml"

Write-Host "=== Stopping Engenox Local Stack ===" -ForegroundColor Cyan

$COMPOSE_ARGS = @("-f", $COMPOSE_FILE, "down")

if ($RemoveOrphans) {
    $COMPOSE_ARGS += "--remove-orphans"
}

if ($Volumes) {
    Write-Host "WARNING: Removing volumes - ALL DATA WILL BE LOST!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 0
    }
    $COMPOSE_ARGS += "-v"
}

docker-compose @COMPOSE_ARGS

if ($Volumes) {
    Write-Host ""
    Write-Host "All volumes removed. Next start will be a fresh stack." -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "Stack stopped. Volumes preserved. Start with .\scripts\local-up.ps1" -ForegroundColor Green
}