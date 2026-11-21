# Takes a headless Edge screenshot of a page after client-side data has loaded.
# Usage: powershell -File scripts/screenshot.ps1 -Url http://localhost:3100/employees -Out shot.png [-Height 900]
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$Height = 900
)

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { throw "Microsoft Edge was not found at $edge" }

if (Test-Path $Out) { Remove-Item $Out }
$size = "--window-size=1400,$Height"
$shot = "--screenshot=$Out"

# virtual-time-budget lets the page's fetch calls finish before the capture.
& $edge --headless=new --disable-gpu --hide-scrollbars $size --virtual-time-budget=20000 $shot $Url 2>&1 | Out-Null
Start-Sleep -Seconds 2

if (Test-Path $Out) { "saved $Out ($((Get-Item $Out).Length) bytes)" } else { "no screenshot written" }
