# Busca fotos candidatas no Wikimedia Commons para trocar as que ficaram ruins.
# Uso: powershell -File candidatas.ps1 -Saida <pasta>   (lê candidatas.txt: PALAVRA|termo de busca)
param([string]$Saida)
$ua = 'ABCdaTiaAna/1.0 (jogo educativo; github.com/MarcoAurello/jogoABC)'
New-Item -ItemType Directory -Force $Saida | Out-Null
$todas = @()
foreach ($linha in Get-Content (Join-Path $PSScriptRoot 'candidatas.txt') -Encoding UTF8) {
  if (-not $linha.Trim()) { continue }
  $palavra, $termo = $linha.Split('|', 2)
  $u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=300&gsrsearch=' + [uri]::EscapeDataString("$termo filetype:bitmap")
  $tmp = Join-Path $Saida 'resp.json'
  for ($t = 1; $t -le 6; $t++) { $cod = & curl.exe -s -A $ua -o $tmp -w '%{http_code}' $u; if ($cod -eq '200') { break }; Start-Sleep -Seconds ($t * 20) }
  $r = Get-Content $tmp -Raw -Encoding UTF8 | ConvertFrom-Json
  $k = 0
  foreach ($pg in ($r.query.pages.PSObject.Properties.Value | Sort-Object index)) {
    $ii = $pg.imageinfo[0]
    if ($ii.mime -notmatch 'jpeg|png') { continue }
    $k++
    $id = "$($palavra.ToLower())_$k"
    $todas += [pscustomobject]@{ id = $id; titulo = $pg.title; thumb = $ii.thumburl; lic = $ii.extmetadata.LicenseShortName.value; autor = (($ii.extmetadata.Artist.value) -replace '<[^>]+>', '').Trim(); pagina = $ii.descriptionurl }
    if ($k -ge 6) { break }
  }
  Write-Output "$palavra $k candidatas"
  Start-Sleep -Seconds 3
}
foreach ($c in $todas) {
  for ($t = 1; $t -le 5; $t++) { $cod = & curl.exe -s -A $ua -o (Join-Path $Saida "$($c.id).img") -w '%{http_code}' $c.thumb; if ($cod -eq '200') { break }; Start-Sleep -Seconds ($t * 15) }
  Start-Sleep -Milliseconds 1500
}
$todas | ConvertTo-Json | Set-Content (Join-Path $Saida 'candidatas.json') -Encoding UTF8
