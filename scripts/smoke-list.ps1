# Read-only smoke test of the list endpoints. Usage: powershell -File scripts/smoke-list.ps1 [-Port 3100]
param([int]$Port = 3100)

$base = "http://localhost:$Port/api/employees"

function Get-Api([string]$path) {
  $sw = [Diagnostics.Stopwatch]::StartNew()
  try {
    $r = Invoke-WebRequest -Uri "$base$path" -UseBasicParsing
    $sw.Stop()
    return [pscustomobject]@{ Status = [int]$r.StatusCode; Ms = $sw.ElapsedMilliseconds; Body = ($r.Content | ConvertFrom-Json) }
  } catch {
    $sw.Stop()
    $code = [int]$_.Exception.Response.StatusCode
    $text = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    return [pscustomobject]@{ Status = $code; Ms = $sw.ElapsedMilliseconds; Body = ($text | ConvertFrom-Json) }
  }
}

$r = Get-Api "?pageSize=5"
"1 default page        : status=$($r.Status) ms=$($r.Ms) total=$($r.Body.total) pages=$($r.Body.totalPages) first=$($r.Body.items[0].fullName)"

$r = Get-Api "?country=Germany&currency=EUR&sortBy=currentSalary&sortOrder=desc&pageSize=3"
$top = ($r.Body.items | ForEach-Object { "$($_.fullName) $($_.currentSalary) $($_.currency)" }) -join "; "
"2 Germany EUR top pay : status=$($r.Status) ms=$($r.Ms) total=$($r.Body.total) top=$top"

$r = Get-Api "?search=smith&pageSize=3"
"3 search smith        : status=$($r.Status) ms=$($r.Ms) total=$($r.Body.total)"

$r = Get-Api "?status=inactive&pageSize=1"
"4 inactive            : status=$($r.Status) ms=$($r.Ms) total=$($r.Body.total)"

$r = Get-Api "?status=all&pageSize=1"
"5 all                 : status=$($r.Status) ms=$($r.Ms) total=$($r.Body.total)"

$r = Get-Api "?search=%25&pageSize=1"
"6 search for percent  : status=$($r.Status) ms=$($r.Ms) total=$($r.Body.total)"

$r = Get-Api "?page=99999"
"7 far page            : status=$($r.Status) ms=$($r.Ms) items=$($r.Body.items.Count) total=$($r.Body.total)"

$r = Get-Api "/filter-options"
"8 filter options      : status=$($r.Status) ms=$($r.Ms) countries=$($r.Body.countries.Count) currencies=$($r.Body.currencies -join ',') titles=$($r.Body.jobTitles.Count)"

$r = Get-Api "?pageSize=1000"
"9 page size 1000      : status=$($r.Status) code=$($r.Body.error.code)"

$r = Get-Api "?sortBy=password"
"10 bad sort field     : status=$($r.Status) code=$($r.Body.error.code)"

$r = Get-Api "?pageSize=5"
"11 default page, warm : status=$($r.Status) ms=$($r.Ms)"
