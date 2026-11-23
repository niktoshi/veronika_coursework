$root = Split-Path -Parent $PSScriptRoot
$docx = Get-ChildItem -Path $root -Filter '*.docx' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

Write-Output ('file: ' + $docx.Name)

try {
    $word = New-Object -ComObject Word.Application
}
catch {
    Write-Output 'Word is not available on this machine'
    exit 0
}

$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $document = $word.Documents.Open($docx.FullName, $false, $true)
    $pages = $document.ComputeStatistics(2)
    $words = $document.ComputeStatistics(0)
    Write-Output ('pages: ' + $pages)
    Write-Output ('words: ' + $words)
    Write-Output ('paragraphs: ' + $document.Paragraphs.Count)
    Write-Output ('tables: ' + $document.Tables.Count)
    Write-Output ('inline shapes: ' + $document.InlineShapes.Count)
    $document.Close($false)
}
catch {
    Write-Output ('OPEN FAILED: ' + $_.Exception.Message)
}
finally {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
