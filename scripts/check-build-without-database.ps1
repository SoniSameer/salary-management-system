# Proves `next build` does not need a database connection, as on Vercel's build step
# where the database may be unreachable. It blanks the database variables for this
# process only. Next.js never overrides a variable that is already set, so the
# values in .env are not used.
$ErrorActionPreference = "Continue"

foreach ($name in @("DATABASE_URL", "DIRECT_URL", "TEST_DATABASE_URL")) {
  Set-Item "Env:$name" "postgresql://nobody:nothing@127.0.0.1:1/none"
}

$log = Join-Path $env:TEMP "build-without-db.log"
npm run build 2>&1 | Out-File -FilePath $log -Encoding utf8
$built = (Get-Content $log | Select-String "Compiled successfully").Count -gt 0
$errors = @(Get-Content $log | Select-String "Unhandled API error|ECONNREFUSED|Can't reach database|Build error occurred").Count

"build succeeded without a reachable database: $built"
"database errors in the build log: $errors"
Get-Content $log | Select-String "Route \(app\)|ƒ|○|◐" | Select-Object -First 3 | ForEach-Object { $_.Line.Trim() }
