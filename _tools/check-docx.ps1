Add-Type -AssemblyName System.IO.Compression.FileSystem

$docx = Join-Path (Split-Path -Parent $PSScriptRoot) 'Практическая часть.docx'
$zip = [System.IO.Compression.ZipFile]::OpenRead($docx)

Write-Output '--- entries ---'
foreach ($entry in $zip.Entries) {
    Write-Output ($entry.FullName + '  (' + $entry.Length + ')')
}

$entry = $zip.GetEntry('word/document.xml')
$reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
$xmlText = $reader.ReadToEnd()
$reader.Close()
$zip.Dispose()

Write-Output '--- well-formed check ---'
try {
    $doc = [xml]$xmlText
    Write-Output 'document.xml: OK'
}
catch {
    Write-Output ('document.xml: FAILED - ' + $_.Exception.Message)
    exit 1
}

$ns = New-Object System.Xml.XmlNamespaceManager -ArgumentList $doc.NameTable
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

$paragraphs = $doc.SelectNodes('//w:body/w:p', $ns)
$tables = $doc.SelectNodes('//w:tbl', $ns)
Write-Output ('paragraphs: ' + $paragraphs.Count)
Write-Output ('tables: ' + $tables.Count)

$chars = 0
foreach ($p in $paragraphs) {
    foreach ($t in $p.SelectNodes('.//w:t', $ns)) {
        $chars += $t.InnerText.Length
    }
}
Write-Output ('text characters: ' + $chars)

Write-Output '--- headings ---'
foreach ($p in $paragraphs) {
    $styleNode = $p.SelectSingleNode('./w:pPr/w:pStyle', $ns)
    if ($styleNode -ne $null) {
        $value = $styleNode.GetAttribute('w:val')
        $text = ''
        foreach ($t in $p.SelectNodes('.//w:t', $ns)) {
            $text += $t.InnerText
        }
        if ($text.Length -gt 90) {
            $text = $text.Substring(0, 90)
        }
        Write-Output ($value + ' | ' + $text)
    }
}

Write-Output '--- first paragraphs ---'
$limit = [Math]::Min(6, $paragraphs.Count)
for ($i = 0; $i -lt $limit; $i++) {
    $text = ''
    foreach ($t in $paragraphs[$i].SelectNodes('.//w:t', $ns)) {
        $text += $t.InnerText
    }
    Write-Output ($i.ToString() + ': ' + $text)
}
