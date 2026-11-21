# Proves two things about the Prisma CLI on a build server that has NO .env file and
# NO DIRECT_URL (for example Vercel with only DATABASE_URL set):
#   1. `prisma generate` (run by `npm install`) still works.
#   2. `prisma migrate deploy` FAILS with a clear error, and connects to nothing.
# It copies just the schema and config into a scratch folder, so nothing in the
# project is touched.
$ErrorActionPreference = "Continue"

$root = (Get-Location).Path
$scratch = Join-Path $root ".scratch-generate"
if (Test-Path $scratch) { Remove-Item -Recurse -Force $scratch }
New-Item -ItemType Directory -Path "$scratch\prisma", "$scratch\src\lib" | Out-Null

Copy-Item prisma.config.ts "$scratch\prisma.config.ts"
Copy-Item prisma\schema.prisma "$scratch\prisma\schema.prisma"
Copy-Item src\lib\migration-url.ts "$scratch\src\lib\migration-url.ts"

# A clean environment: none of the variables a real .env would provide.
foreach ($name in @("DATABASE_URL", "DIRECT_URL", "TEST_DATABASE_URL")) { Remove-Item "Env:$name" -ErrorAction SilentlyContinue }

$prisma = "$root\node_modules\.bin\prisma.cmd"
Push-Location $scratch
try {
  $generate = & $prisma generate --config "$scratch\prisma.config.ts" 2>&1 | Out-String
  "1. prisma generate exit code: $LASTEXITCODE"
  "   client written: " + (Test-Path "$scratch\src\generated\prisma\client.ts")

  $migrate = & $prisma migrate deploy --config "$scratch\prisma.config.ts" 2>&1 | Out-String
  "2. prisma migrate deploy exit code: $LASTEXITCODE (must NOT be 0)"
  $reason = ($migrate -split "`n" | Where-Object { $_ -match "^\s*Error:" } | Select-Object -First 1)
  "   reason: $("$reason".Trim())"
} finally {
  Pop-Location
  # The Prisma process can hold files for a moment after it exits, so retry.
  for ($attempt = 1; $attempt -le 5 -and (Test-Path $scratch); $attempt++) {
    Remove-Item -Recurse -Force $scratch -ErrorAction SilentlyContinue
    if (Test-Path $scratch) { Start-Sleep -Seconds 1 }
  }
}
