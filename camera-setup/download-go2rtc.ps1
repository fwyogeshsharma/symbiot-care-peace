# PowerShell script to download go2rtc for Windows
$ErrorActionPreference = "Stop"

Write-Host "Downloading go2rtc..." -ForegroundColor Yellow

$downloadUrl = "https://github.com/AlexxIT/go2rtc/releases/download/v1.9.12/go2rtc_win64.zip"
$zipPath = Join-Path $PSScriptRoot "go2rtc_win64.zip"

Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
Write-Host "Download complete!" -ForegroundColor Green

Write-Host "Extracting..." -ForegroundColor Yellow
Expand-Archive -Path $zipPath -DestinationPath $PSScriptRoot -Force
Remove-Item $zipPath -Force

Write-Host "go2rtc installed successfully!" -ForegroundColor Green
