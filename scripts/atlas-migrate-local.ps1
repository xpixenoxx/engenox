<#
.SYNOPSIS
    Run Atlas migrations against local Postgres
.DESCRIPTION
    Applies migrations from libs/kg/migrations/atlas and runs RLS introspection
#>

$DATABASE_URL = "postgresql://engenox:engenox@localhost:5432/engenox?sslmode=disable"
$MIGRATION_DIR = "libs/kg/migrations/atlas"

Write-Host "Running Atlas migrations on local Postgres..." -ForegroundColor Cyan
Write-Host "   DB: $DATABASE_URL"
Write-Host "   Migrations: $MIGRATION_DIR"

# Use mise to run atlas
Set-Location $MIGRATION_DIR
mise exec -- atlas migrate apply --env dev -u $DATABASE_URL --dir "file://."

Write-Host "Migrations applied successfully" -ForegroundColor Green

# Run RLS introspection test
$RLS_INTROSPECTION = "../../scripts/rls_introspection.py"
if (Test-Path $RLS_INTROSPECTION) {
    Write-Host "Running RLS introspection..."
    mise exec -- python3 $RLS_INTROSPECTION --url $DATABASE_URL
}