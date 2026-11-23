Add-Type -AssemblyName System.IO.Compression.FileSystem

$docx = Get-ChildItem -Path (Split-Path -Parent $PSScriptRoot) -Filter '*.docx' |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

$zip = [System.IO.Compression.ZipFile]::OpenRead($docx.FullName)
$entry = $zip.GetEntry('word/document.xml')
$reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
$xmlText = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()

$doc = [xml]$xmlText
$ns = New-Object System.Xml.XmlNamespaceManager -ArgumentList $doc.NameTable
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

$paragraphs = $doc.SelectNodes('//w:body/w:p', $ns)

$placeholders = 0
$captions = @()

foreach ($p in $paragraphs) {
    $text = ''
    foreach ($t in $p.SelectNodes('.//w:t', $ns)) {
        $text += $t.InnerText
    }
    if ($text -like '*место для скриншота*') {
        $placeholders++
    }
    if ($text.StartsWith('Рис. ')) {
        $captions += $text
    }
}

Write-Output ('placeholders: ' + $placeholders)
Write-Output ('captions: ' + $captions.Count)
$captions | ForEach-Object { Write-Output ('  ' + $_) }

Write-Output '--- code paragraph sample ---'
$codeParagraph = $null
foreach ($p in $paragraphs) {
    $run = $p.SelectSingleNode('./w:r', $ns)
    if ($run -ne $null) {
        $fonts = $run.SelectSingleNode('./w:rPr/w:rFonts', $ns)
        if ($fonts -ne $null -and $fonts.GetAttribute('w:ascii') -eq 'Courier New') {
            $codeParagraph = $p
            break
        }
    }
}

if ($codeParagraph -ne $null) {
    $text = ''
    foreach ($t in $codeParagraph.SelectNodes('.//w:t', $ns)) {
        $text += $t.InnerText
    }
    Write-Output ('text: ' + $text)
    Write-Output $codeParagraph.OuterXml.Substring(0, [Math]::Min(600, $codeParagraph.OuterXml.Length))
}
else {
    Write-Output 'no code paragraph found'
}

Write-Output '--- first table ---'
$table = $doc.SelectSingleNode('//w:tbl', $ns)
if ($table -ne $null) {
    $rows = $table.SelectNodes('./w:tr', $ns)
    Write-Output ('rows: ' + $rows.Count)
    foreach ($cell in $rows[0].SelectNodes('./w:tc', $ns)) {
        $cellText = ''
        foreach ($t in $cell.SelectNodes('.//w:t', $ns)) {
            $cellText += $t.InnerText
        }
        Write-Output ('  header cell: ' + $cellText)
    }
}
