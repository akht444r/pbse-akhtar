# Step 9 of the lab, for Windows PowerShell. Run this in a SECOND terminal,
# while `npm run mock` is running in the first one.

# ====================================================================
#  CHANGE THESE THREE LINES FOR YOUR OWN SYSTEM, then edit body.json.
#  Nothing below this block needs touching.
# ====================================================================
$ListPath   = "/things"                    # your collection GET
$ListQuery  = "status=active&limit=5"      # its filter
$CreatePath = "/things"                    # your POST that must not happen twice
# ====================================================================

# Two Windows details this script handles for you:
#
#  1. It calls curl.exe, not curl. In PowerShell, `curl` is a different
#     command (Invoke-WebRequest) that takes different options, and it will
#     confuse you for twenty minutes before you notice.
#
#  2. The request body comes from body.json instead of being typed inline.
#     PowerShell mangles quotes inside a JSON string on the command line, and
#     curl then fails with "URL malformed" for no visible reason.

$Base = if ($env:BASE) { $env:BASE } else { "http://127.0.0.1:4010" }
$Out  = "./evidence"
New-Item -ItemType Directory -Force -Path $Out | Out-Null

curl.exe -s -o NUL --max-time 3 "$Base$ListPath"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Cannot reach $Base$ListPath" -ForegroundColor Red
  Write-Host "Is the mock running? In another terminal:  npm run mock"
  exit 1
}

Write-Host "=== 1. A list, with a filter ========================================" -ForegroundColor Cyan
curl.exe -is --max-time 15 "$Base$ListPath`?$ListQuery" |
  Tee-Object -FilePath "$Out/1-list.txt"

Write-Host ""
Write-Host "=== 2. The dangerous operation, WITH a ticket number ================" -ForegroundColor Cyan
$Key = [guid]::NewGuid().ToString()
curl.exe -is --max-time 15 -X POST "$Base$CreatePath" `
  -H "Idempotency-Key: $Key" `
  -H "Content-Type: application/json" `
  -d "@body.json" |
  Tee-Object -FilePath "$Out/2-create.txt"

Write-Host ""
Write-Host "=== 3. The same request again, with the SAME ticket number ==========" -ForegroundColor Cyan
Write-Host "    Expect: 201 again, and a second thing created."
Write-Host "    That is correct for a mock. It has no memory of ticket numbers."
Write-Host "    The mock proves your CONTRACT, not your BEHAVIOUR. Making the"
Write-Host "    second call replay the first is what you build in Meeting 3."
curl.exe -is --max-time 15 -X POST "$Base$CreatePath" `
  -H "Idempotency-Key: $Key" `
  -H "Content-Type: application/json" `
  -d "@body.json" | Select-Object -First 1

Write-Host ""
Write-Host "=== 4. The same request with NO ticket number - the one that matters " -ForegroundColor Cyan
curl.exe -is --max-time 15 -X POST "$Base$CreatePath" `
  -H "Content-Type: application/json" `
  -d "@body.json" |
  Tee-Object -FilePath "$Out/3-create-no-key.txt"

Write-Host ""
Write-Host "--------------------------------------------------------------------"
Write-Host "Call 4 should be 422, and the sl-violations header should mention" -ForegroundColor Yellow
Write-Host "'idempotency-key'. If it does, your written interface just refused a" -ForegroundColor Yellow
Write-Host "request that no code you have written enforces. Screenshot it." -ForegroundColor Yellow
Write-Host "That is your evidence for L2." -ForegroundColor Yellow
