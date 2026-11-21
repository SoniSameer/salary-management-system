# Creates one employee through the real API (use only against the TEST database server)
# and prints its id, so the edit page can be opened in a browser.
param([int]$Port = 3200)

$body = @{
  fullName = "Grace Hopper"
  email = "grace.hopper@acme-demo.example"
  country = "United States"
  department = "Engineering"
  jobTitle = "Engineering Manager"
  currency = "USD"
  salary = 160000
  hiredAt = "2021-04-12"
} | ConvertTo-Json

try {
  $created = Invoke-RestMethod -Uri "http://localhost:$Port/api/employees" -Method Post -Body $body -ContentType "application/json"
  "created id=$($created.id) salary=$($created.currentSalary) $($created.currency)"
} catch {
  $status = [int]$_.Exception.Response.StatusCode
  $text = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd()
  "create failed: status=$status body=$text"
}
