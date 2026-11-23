$lines = Get-Content -Encoding UTF8 '_tmp_docx.txt'
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'ПРАКТИЧЕСКАЯ|^\s*2\.\d') {
        Write-Output ($i.ToString() + ': ' + $lines[$i].Substring(0, [Math]::Min(110, $lines[$i].Length)))
    }
}
