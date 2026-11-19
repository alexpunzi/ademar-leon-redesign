$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$files = [ordered]@{
    clasificacion = 'clasificacion.json'
    partidos = 'partidos.json'
    plantilla = 'plantilla.json'
    noticias = 'noticias.json'
}
$data = [ordered]@{}

foreach ($key in $files.Keys) {
    $path = Join-Path $root ('data\' + $files[$key])
    $data[$key] = Get-Content -Raw -Encoding UTF8 $path | ConvertFrom-Json
}

$json = ConvertTo-Json -InputObject $data -Depth 50 -Compress
$output = Join-Path $root 'js\data-fallback.js'
$script = 'window.NEXO_DATA_FALLBACK = ' + $json + ';' + [Environment]::NewLine
[IO.File]::WriteAllText($output, $script, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Respaldo local actualizado desde data/*.json: $output"
