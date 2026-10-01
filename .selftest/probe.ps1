# Calls one dsh-skillbox HTTP method with the browser-session cookie the running
# DSH web carrier expects. The cookie is derived from the credential record
# `client-connection/browser-session`, so no browser is needed.
#
# Usage:
#   .\.selftest\probe.ps1 list
#   .\.selftest\probe.ps1 kick
#   .\.selftest\probe.ps1 toggle '{"name":"...","enabled":false}'
param(
  [Parameter(Mandatory = $true)][string]$Method,
  [string]$Body = '{}',
  [string]$Base = 'http://127.0.0.1:19387'
)

$ErrorActionPreference = 'Stop'

function ConvertTo-B64Url([byte[]]$bytes) {
  [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
}

$authority = ([uri]$Base).Authority
$credentialPath = Join-Path $env:DSH_HOME '.credentials.yaml'
$lines = Get-Content $credentialPath
$at = ($lines | Select-String 'client-connection/browser-session').LineNumber
if (-not $at) { throw "no browser-session record in $credentialPath" }
$secret = ($lines[$at..($lines.Count - 1)] | Select-String '^\s*secret:\s*(\S+)' | Select-Object -First 1).Matches[0].Groups[1].Value
$key = [Convert]::FromBase64String($secret.Replace('-', '+').Replace('_', '/') + ('=' * ((4 - $secret.Length % 4) % 4)))
$sha = [System.Security.Cryptography.SHA256]::Create()
$name = 'dsh-auth-' + (ConvertTo-B64Url ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($authority))))
$now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$payload = [ordered]@{ version = 1; authority = $authority; issuedAt = $now; expiresAt = $now + 2592000000 }
$body64 = ConvertTo-B64Url ([Text.Encoding]::UTF8.GetBytes(($payload | ConvertTo-Json -Compress)))
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = $key
$signature = ConvertTo-B64Url ($hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($body64)))
$cookie = "$name=v1.$body64.$signature"

Write-Host "→ POST $Base/api/skillbox/$Method" -ForegroundColor DarkGray
$response = curl.exe -s -i -X POST -H "Cookie: $cookie" -H 'Content-Type: application/json' -d $Body "$Base/api/skillbox/$Method"
$response
