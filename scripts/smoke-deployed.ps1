# Read-only smoke test of a running deployment. It only sends GET requests, so it is safe
# against the live demo. Exits with a non-zero code if any check fails.
# Usage: powershell -File scripts/smoke-deployed.ps1 -BaseUrl https://your-app.vercel.app
param([Parameter(Mandatory = $true)][string]$BaseUrl)

$ProgressPreference = "SilentlyContinue"
$BaseUrl = $BaseUrl.TrimEnd("/")
$failures = 0

function Get-Url([string]$path) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-WebRequest -Uri "$BaseUrl$path" -UseBasicParsing -MaximumRedirection 5
    return [pscustomobject]@{ Status = [int]$r.StatusCode; Body = $r.Content; Ms = $sw.ElapsedMilliseconds }
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    $body = ""
    if ($_.Exception.Response) { $body = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() }
    return [pscustomobject]@{ Status = $status; Body = $body; Ms = $sw.ElapsedMilliseconds }
  }
}

function Check([string]$name, [bool]$passed, [string]$detail = "") {
  if ($passed) { "  PASS  $name $detail" } else { "  FAIL  $name $detail"; $script:failures++ }
}

"Smoke test of $BaseUrl"

$page = Get-Url "/employees"
Check "/employees renders" ($page.Status -eq 200) "(status $($page.Status), $($page.Ms) ms)"
Check "demo banner is on the page" ($page.Body -match "Demo with synthetic data")
Check "page has a title and heading" (($page.Body -match "<title>") -and ($page.Body -match "Employees"))

$insightsPage = Get-Url "/insights"
Check "/insights renders" ($insightsPage.Status -eq 200) "(status $($insightsPage.Status))"

$list = Get-Url "/api/employees?pageSize=1"
$listJson = $null
if ($list.Status -eq 200) { $listJson = $list.Body | ConvertFrom-Json }
Check "employee list API" ($list.Status -eq 200 -and $listJson.total -gt 0) "(total $($listJson.total), $($list.Ms) ms)"

$options = Get-Url "/api/employees/filter-options"
$optionsJson = $null
if ($options.Status -eq 200) { $optionsJson = $options.Body | ConvertFrom-Json }
Check "filter options API" ($options.Status -eq 200 -and $optionsJson.countries.Count -gt 0) "($($optionsJson.countries.Count) countries, $($options.Ms) ms)"

$currencies = Get-Url "/api/insights/currencies"
$currencyJson = $null
if ($currencies.Status -eq 200) { $currencyJson = $currencies.Body | ConvertFrom-Json }
Check "currencies API" ($currencies.Status -eq 200 -and $currencyJson.currencies.Count -gt 0) "($(($currencyJson.currencies | ForEach-Object { $_.currency }) -join ', '))"

if ($currencyJson -and $currencyJson.currencies.Count -gt 0) {
  $code = $currencyJson.currencies[0].currency
  $insights = Get-Url "/api/insights?currency=$code"
  $insightsJson = $null
  if ($insights.Status -eq 200) { $insightsJson = $insights.Body | ConvertFrom-Json }
  Check "insights for $code" ($insights.Status -eq 200 -and $insightsJson.overall.headcount -gt 0) "(median $($insightsJson.overall.median), $($insights.Ms) ms)"

  $distribution = Get-Url "/api/insights/distribution?currency=$code"
  $distJson = $null
  if ($distribution.Status -eq 200) { $distJson = $distribution.Body | ConvertFrom-Json }
  $counted = ($distJson.buckets | Measure-Object -Property count -Sum).Sum
  Check "distribution adds up to the headcount" ($distribution.Status -eq 200 -and $counted -eq $insightsJson.overall.headcount) "($counted of $($insightsJson.overall.headcount))"
}

$noCurrency = Get-Url "/api/insights"
Check "insights refuses to guess a currency" ($noCurrency.Status -eq 400) "(status $($noCurrency.Status))"

# A streamed page has already sent status 200 by the time it finds the id is invalid, so Next.js
# shows the not-found page and adds a noindex tag instead of changing the status code.
$badPage = Get-Url "/employees/not-a-real-id"
Check "malformed employee id shows the not-found page" ($badPage.Body -match "could not be found") "(status $($badPage.Status))"
Check "and tells search engines not to index it" ($badPage.Body -match 'name="robots"[^>]*noindex')

$badSort = Get-Url "/api/employees?sortBy=password"
Check "unknown sort field is rejected" ($badSort.Status -eq 400) "(status $($badSort.Status))"

""
if ($failures -eq 0) { "All checks passed." } else { "$failures check(s) FAILED." }
exit $failures
