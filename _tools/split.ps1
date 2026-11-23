$lines = Get-Content -Encoding UTF8 '_tmp_docx.txt'
$chunk = $lines[198..609]
$size = 70
$idx = 0
for ($start = 0; $start -lt $chunk.Count; $start += $size) {
    $end = [Math]::Min($start + $size - 1, $chunk.Count - 1)
    $part = $chunk[$start..$end]
    $out = "_tools\ch2_$idx.txt"
    $part | Set-Content -Encoding UTF8 $out
    Write-Output ($out + ' lines ' + $start + '-' + $end)
    $idx++
}
