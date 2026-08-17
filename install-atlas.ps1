$url = 'https://release.ariga.io/atlas/atlas-windows-amd64-v0.38.0.exe'
$out = 'D:\Engenox\atlas\atlas.exe'
$dir = 'D:\Engenox\atlas'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
Invoke-WebRequest -Uri $url -OutFile $out
$env:PATH += ';D:\Engenox\atlas'
Write-Host "Atlas installed to $out"