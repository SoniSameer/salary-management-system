# Starts the production server against the TEST database, so manual checks never touch demo data.
# The URL is read from .env and set only for this process. It is never printed.
# Usage: powershell -File scripts/serve-test-db.ps1 [-Port 3200]
param([int]$Port = 3200)

$line = Get-Content .env | Where-Object { $_ -match '^TEST_DATABASE_URL=' } | Select-Object -First 1
if (-not $line) { throw "TEST_DATABASE_URL is not set in .env" }

$env:DATABASE_URL = ($line -replace '^TEST_DATABASE_URL=', '').Trim().Trim('"')
npx next start --port $Port
