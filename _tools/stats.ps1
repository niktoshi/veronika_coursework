$t = Get-Content -Raw -Encoding UTF8 '_tmp_docx.txt'
Write-Output ('chars: ' + $t.Length)
$lines = $t -split "`r?`n"
Write-Output ('lines: ' + $lines.Count)
Write-Output '--- first 120 lines ---'
$lines[0..119] | ForEach-Object { $_ }
