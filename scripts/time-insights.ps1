# Times the insights endpoints, warm. Read-only. Usage: powershell -File scripts/time-insights.ps1 [-Port 3100]
param([int]$Port = 3100)

function Measure-Call($path) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $r = Invoke-WebRequest -Uri "http://localhost:$Port$path" -UseBasicParsing
  $sw.Stop()
  "{0,-52} status={1} {2,5} ms  {3,6} bytes" -f $path, [int]$r.StatusCode, $sw.ElapsedMilliseconds, $r.Content.Length
}

# One warm-up call so a cold database connection is not counted.
Measure-Call "/api/insights/currencies" | Out-Null

foreach ($path in @(
  "/api/insights/currencies",
  "/api/insights?currency=USD",
  "/api/insights?currency=EUR",
  "/api/insights/distribution?currency=USD",
  "/api/insights/distribution?currency=JPY"
)) {
  Measure-Call $path
  Measure-Call $path
}
