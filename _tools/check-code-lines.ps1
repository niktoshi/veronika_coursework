$lines = Get-Content -Encoding UTF8 (Join-Path $PSScriptRoot 'chapter2.md')
$inCode = $false
$max = 0
$longLines = @()
$count = 0

foreach ($line in $lines) {
    if ($line.Trim() -eq '[code]') {
        $inCode = $true
        continue
    }
    if ($line.Trim() -eq '[/code]') {
        $inCode = $false
        continue
    }
    if ($inCode) {
        $count++
        if ($line.Length -gt $max) {
            $max = $line.Length
        }
        if ($line.Length -gt 73) {
            $longLines += ($line.Length.ToString() + ' | ' + $line)
        }
    }
}

Write-Output ('code lines: ' + $count)
Write-Output ('max length: ' + $max)
Write-Output ('lines longer than 73: ' + $longLines.Count)
$longLines | ForEach-Object { Write-Output $_ }
