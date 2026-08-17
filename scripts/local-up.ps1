<#
.SYNOPSIS
    Start the Engenox local development stack
.DESCRIPTION
    Starts Postgres+AGE+pgvector, Valkey 9.0, Redpanda, Temporal, MinIO, ClickHouse,
    Grafana stack (Mimir/Loki/Tempo), Langfuse, and OTel Collector via docker-compose.
    Waits for all services to be healthy.
#>

param(
    [switch]$Build = $false
)

Write-Host "Starting Engenox Local Dev Stack..." -ForegroundColor Green

# Check Docker is running (Docker Desktop compatible)
try {
    $dockerInfo = docker info 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $dockerInfo) {
        Write-Host "Docker is not running. Start Docker Desktop first." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "Docker command failed. Ensure Docker Desktop is running and in PATH." -ForegroundColor Red
    exit 1
}

# Start containers
if ($Build) {
    Write-Host "Building images..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml up -d --build
}
else {
    docker-compose -f docker-compose.dev.yml up -d
}

# Wait for health checks
Write-Host "Waiting for services to be healthy..." -ForegroundColor Yellow

# Core services in dependency order
$services = @(
    @{ Name = "engenox-postgres";        Timeout = 90 },
    @{ Name = "engenox-valkey";          Timeout = 60 },
    @{ Name = "engenox-redpanda";        Timeout = 60 },
    @{ Name = "engenox-temporal-postgres"; Timeout = 60 },
    @{ Name = "engenox-temporal";        Timeout = 90 },
    @{ Name = "engenox-minio";           Timeout = 60 },
    @{ Name = "engenox-clickhouse";      Timeout = 90 },
    @{ Name = "engenox-mimir";           Timeout = 90 },
    @{ Name = "engenox-loki";            Timeout = 90 },
    @{ Name = "engenox-tempo";           Timeout = 90 },
    @{ Name = "engenox-grafana";         Timeout = 90 },
    @{ Name = "engenox-langfuse";        Timeout = 120 }
)

foreach ($svcInfo in $services) {
    $svc = $svcInfo.Name
    $maxWait = $svcInfo.Timeout
    $startTime = Get-Date

    Write-Host "  Waiting for $svc (timeout: ${maxWait}s)..."
    $healthy = $false

    while (-not $healthy) {
        $elapsed = ((Get-Date) - $startTime).TotalSeconds

        # Get health status using docker inspect
        $status = docker inspect --format='{{.State.Health.Status}}' $svc 2>$null

        if ($status -eq "healthy") {
            $healthy = $true
            Write-Host "  $svc is healthy" -ForegroundColor Green
        }
        elseif ($elapsed -gt $maxWait) {
            Write-Host "  $svc timed out after ${maxWait}s" -ForegroundColor Red
            docker logs $svc --tail 30
            exit 1
        }
        else {
            Start-Sleep -Seconds 3
        }
    }
}

Write-Host ""
Write-Host "All services healthy!" -ForegroundColor Green
Write-Host ""
Write-Host "Connection Info:" -ForegroundColor Cyan
Write-Host "  Postgres (app):     postgresql://engenox:engenox@localhost:5432/engenox"
Write-Host "  Valkey:             valkey://localhost:6379"
Write-Host "  Redpanda (Kafka):   localhost:9092"
Write-Host "  Temporal gRPC:      localhost:7233"
Write-Host "  Temporal UI:        http://localhost:8233"
Write-Host "  MinIO S3 API:       http://localhost:9000"
Write-Host "  MinIO Console:      http://localhost:9001 (minioadmin/minioadmin123)"
Write-Host "  ClickHouse:         http://localhost:8123"
Write-Host "  Grafana:            http://localhost:3000 (admin/admin)"
Write-Host "  Langfuse:           http://localhost:3001"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Run Atlas migrations:     .\scripts\atlas-migrate-local.ps1"
Write-Host "  2. Seed consent fixture:     .\scripts\seed-consent-local.ps1"
Write-Host "  3. Start services:          See FOUNDER_EXECUTION_BLUEPRINT.md Phase 2"
Write-Host ""
Write-Host "To stop: .\scripts\local-down.ps1" -ForegroundColor Gray