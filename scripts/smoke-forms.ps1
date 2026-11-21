# Creates one employee and two salary changes through the real API
# (use only against the TEST database server), then prints the id so the
# details and edit pages can be opened in a browser.
param([int]$Port = 3200)

$base = "http://localhost:$Port/api/employees"

function Send($url, $payload) {
  try {
    return Invoke-RestMethod -Uri $url -Method Post -Body ($payload | ConvertTo-Json) -ContentType "application/json"
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    $text = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
    throw "request to $url failed: status=$status body=$text"
  }
}

$created = Send $base @{
  fullName = "Grace Hopper"
  email = "grace.hopper@acme-demo.example"
  country = "United States"
  department = "Engineering"
  jobTitle = "Engineering Manager"
  currency = "USD"
  salary = 160000
  hiredAt = "2021-04-12"
}
"created id=$($created.id) salary=$($created.currentSalary) $($created.currency)"

$first = Send "$base/$($created.id)/salary" @{ salary = 172000; reason = "Promotion" }
"raise 1: now $($first.employee.currentSalary)"
$second = Send "$base/$($created.id)/salary" @{ salary = 165000; reason = "Market adjustment" }
"change 2: now $($second.employee.currentSalary)"
