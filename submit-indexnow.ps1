<#
.SYNOPSIS
  Submit URLs to IndexNow (Bing, Yandex, and other participating engines).

.DESCRIPTION
  With no arguments, submits every <loc> URL found in sitemap.xml.
  Pass one or more URLs to submit only those (use after changing specific pages).

.EXAMPLE
  ./submit-indexnow.ps1
  ./submit-indexnow.ps1 https://whiskeybarrel.com/invest/ https://whiskeybarrel.com/
#>
param(
    [string[]]$Urls
)

$ErrorActionPreference = 'Stop'

$Host_       = 'whiskeybarrel.com'
$Key         = '5455933ad335175959df481f421993ac'
$KeyLocation = "https://$Host_/$Key.txt"

# Default to all URLs in the sitemap when none are passed.
if (-not $Urls -or $Urls.Count -eq 0) {
    $sitemapPath = Join-Path $PSScriptRoot 'sitemap.xml'
    [xml]$sitemap = Get-Content $sitemapPath
    $Urls = $sitemap.urlset.url.loc
}

$body = @{
    host        = $Host_
    key         = $Key
    keyLocation = $KeyLocation
    urlList     = @($Urls)
} | ConvertTo-Json

Write-Host "Submitting $($Urls.Count) URL(s) to IndexNow..."
$Urls | ForEach-Object { Write-Host "  $_" }

$resp = Invoke-WebRequest -Uri 'https://api.indexnow.org/indexnow' `
    -Method Post `
    -ContentType 'application/json; charset=utf-8' `
    -Body $body `
    -UseBasicParsing

Write-Host "HTTP $($resp.StatusCode) $($resp.StatusDescription)"
# 200 = accepted, 202 = accepted/pending verification. Both are success.
