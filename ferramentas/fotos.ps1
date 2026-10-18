# Baixa a foto principal (Wikipedia/Wikimedia Commons) de cada palavra de fotos.txt e guarda os créditos.
# Faz só 2 consultas (todas as palavras de uma vez) para respeitar o limite do Wikimedia.
# Uso: powershell -File ferramentas\fotos.ps1 -Saida _baixadas
param([string]$Saida)
$ua = 'ABCdaTiaAna/1.0 (jogo educativo; github.com/MarcoAurello/jogoABC)'
New-Item -ItemType Directory -Force $Saida | Out-Null
function Pegar($url) {
  for ($t = 1; $t -le 8; $t++) {
    $tmp = Join-Path $Saida 'resp.json'
    $cod = & curl.exe -s -A $ua -o $tmp -w '%{http_code}' $url
    if ($cod -eq '200') { return (Get-Content $tmp -Raw -Encoding UTF8 | ConvertFrom-Json) }
    Write-Output "  (limite do servidor: $cod, esperando $($t * 30) s)" | Out-Host
    Start-Sleep -Seconds ($t * 30)
  }
  throw "falhou: $url"
}
$lista = Get-Content (Join-Path $PSScriptRoot 'fotos.txt') -Encoding UTF8 | Where-Object { $_ -and -not $_.StartsWith('#') } | ForEach-Object { $p = $_.Split('|', 2); [pscustomobject]@{ Palavra = $p[0]; Alvo = $p[1] } }

# 1) foto principal de cada artigo (de 40 em 40: a API aceita até 50 por vez)
$alvos = @($lista | Where-Object { -not $_.Alvo.StartsWith('File:') } | ForEach-Object { $_.Alvo })
$mapa = @{}
$imagemDe = @{}
for ($k = 0; $k -lt $alvos.Count; $k += 40) {
  $titulos = ($alvos[$k..([Math]::Min($k + 39, $alvos.Count - 1))]) -join '|'
  $r = Pegar ("https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&pilimit=50&titles=" + [uri]::EscapeDataString($titulos))
  foreach ($n in @($r.query.normalized)) { if ($n) { $mapa[$n.to] = $n.from } }
  foreach ($n in @($r.query.redirects)) { if ($n) { $orig = if ($mapa[$n.from]) { $mapa[$n.from] } else { $n.from }; $mapa[$n.to] = $orig } }
  foreach ($pg in $r.query.pages.PSObject.Properties.Value) {
  $orig = if ($mapa[$pg.title]) { $mapa[$pg.title] } else { $pg.title }
  if ($pg.pageimage) { $imagemDe[$orig] = $pg.pageimage }
}
  Start-Sleep -Seconds 3
}
foreach ($i in $lista) { $i | Add-Member Arquivo ($(if ($i.Alvo.StartsWith('File:')) { $i.Alvo.Substring(5) } else { $imagemDe[$i.Alvo] })) }

# 2) endereço da miniatura e licença de cada arquivo no Commons
$todos = @($lista | Where-Object Arquivo | ForEach-Object { 'File:' + $_.Arquivo })
$info = @{}
$norm = @{}
for ($k = 0; $k -lt $todos.Count; $k += 40) {
  $arquivos = ($todos[$k..([Math]::Min($k + 39, $todos.Count - 1))]) -join '|'
  Start-Sleep -Seconds 3
  $r = Pegar ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=500&titles=" + [uri]::EscapeDataString($arquivos))
  foreach ($n in @($r.query.normalized)) { if ($n) { $norm[$n.to] = $n.from } }
  foreach ($pg in $r.query.pages.PSObject.Properties.Value) { $info[($pg.title -replace '^File:', '')] = $pg; if ($norm[$pg.title]) { $info[($norm[$pg.title] -replace '^File:', '')] = $pg } }
}

# 3) baixa as miniaturas, devagar
$creditos = @()
foreach ($i in $lista) {
  if (-not $i.Arquivo) { Write-Output "$($i.Palavra)`tSEM FOTO NO ARTIGO"; continue }
  $pg = $info[$i.Arquivo]; if (-not $pg) { $pg = $info[$i.Arquivo -replace '_', ' '] }
  if (-not $pg -or -not $pg.imageinfo) { Write-Output "$($i.Palavra)`tNAO ESTA NO COMMONS: $($i.Arquivo)"; continue }
  $ii = $pg.imageinfo[0]; $md = $ii.extmetadata
  $destino = Join-Path $Saida ($i.Palavra.ToLower() + '.img')
  if (-not (Test-Path $destino)) {
    for ($t = 1; $t -le 6; $t++) {
      $cod = & curl.exe -s -A $ua -o $destino -w '%{http_code}' $ii.thumburl
      if ($cod -eq '200') { break }
      Remove-Item $destino -ErrorAction SilentlyContinue; Start-Sleep -Seconds ($t * 20)
    }
    Start-Sleep -Seconds 3
  }
  $autor = if ($md.Artist) { ($md.Artist.value -replace '<[^>]+>', '').Trim() } else { 'desconhecido' }
  $lic = if ($md.LicenseShortName) { $md.LicenseShortName.value } else { '?' }
  $creditos += "| $($i.Palavra) | $autor | $lic | $($ii.descriptionurl) |"
  Write-Output "$($i.Palavra)`t$lic`t$($i.Arquivo)"
}
$creditos | Set-Content (Join-Path $Saida 'creditos.txt') -Encoding UTF8
