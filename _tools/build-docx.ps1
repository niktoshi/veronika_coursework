$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $PSScriptRoot 'chapter2.md'
$buildDir = Join-Path $PSScriptRoot '_docx_build'
$outputFile = Join-Path $root 'Практическая часть.docx'

if (Test-Path $buildDir) {
    Remove-Item $buildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $buildDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $buildDir '_rels') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $buildDir 'word') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $buildDir 'word\_rels') | Out-Null

$utf8 = New-Object System.Text.UTF8Encoding($false)

function Write-Utf8File {
    param([string]$Path, [string]$Content)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Escape-Xml {
    param([string]$Text)
    $result = $Text.Replace('&', '&amp;')
    $result = $result.Replace('<', '&lt;')
    $result = $result.Replace('>', '&gt;')
    return $result
}

function New-Run {
    param(
        [string]$Text,
        [string]$Font = 'Times New Roman',
        [int]$Size = 28,
        [switch]$Bold,
        [switch]$Italic,
        [string]$Color = ''
    )

    $runProps = '<w:rPr><w:rFonts w:ascii="' + $Font + '" w:hAnsi="' + $Font + '" w:cs="' + $Font + '"/>'
    if ($Bold) {
        $runProps += '<w:b/><w:bCs/>'
    }
    if ($Italic) {
        $runProps += '<w:i/><w:iCs/>'
    }
    if ($Color -ne '') {
        $runProps += '<w:color w:val="' + $Color + '"/>'
    }
    $runProps += '<w:sz w:val="' + $Size + '"/><w:szCs w:val="' + $Size + '"/></w:rPr>'

    return '<w:r>' + $runProps + '<w:t xml:space="preserve">' + (Escape-Xml $Text) + '</w:t></w:r>'
}

function New-Paragraph {
    param(
        [string]$Text,
        [string]$Style = '',
        [string]$Alignment = 'both',
        [int]$FirstLine = 709,
        [int]$LeftIndent = 0,
        [int]$Hanging = 0,
        [int]$Before = 0,
        [int]$After = 0,
        [int]$Line = 360,
        [switch]$Bold,
        [switch]$Italic,
        [string]$Font = 'Times New Roman',
        [int]$Size = 28,
        [string]$Color = '',
        [string]$Shading = '',
        [switch]$KeepNext
    )

    $props = '<w:pPr>'
    if ($Style -ne '') {
        $props += '<w:pStyle w:val="' + $Style + '"/>'
    }
    if ($KeepNext) {
        $props += '<w:keepNext/>'
    }
    if ($Shading -ne '') {
        $props += '<w:shd w:val="clear" w:color="auto" w:fill="' + $Shading + '"/>'
    }
    $props += '<w:spacing w:before="' + $Before + '" w:after="' + $After + '" w:line="' + $Line + '" w:lineRule="auto"/>'
    if ($Hanging -gt 0) {
        $props += '<w:ind w:left="' + $LeftIndent + '" w:hanging="' + $Hanging + '"/>'
    }
    elseif (($LeftIndent -gt 0) -or ($FirstLine -gt 0)) {
        $props += '<w:ind w:left="' + $LeftIndent + '" w:firstLine="' + $FirstLine + '"/>'
    }
    if ($Alignment -ne '') {
        $props += '<w:jc w:val="' + $Alignment + '"/>'
    }
    $props += '</w:pPr>'

    $run = New-Run -Text $Text -Font $Font -Size $Size -Bold:$Bold -Italic:$Italic -Color $Color

    return '<w:p>' + $props + $run + '</w:p>'
}

function New-Table {
    param([string[]]$Rows)

    $parsed = @()
    foreach ($row in $Rows) {
        if ($row.Trim() -eq '') {
            continue
        }
        $parsed += , ($row -split '\|')
    }

    $cols = 0
    foreach ($row in $parsed) {
        if ($row.Count -gt $cols) {
            $cols = $row.Count
        }
    }

    if ($cols -eq 2) {
        $widths = @(3600, 5755)
    }
    else {
        $widths = @(1500, 3000, 4855)
    }

    $xml = '<w:tbl><w:tblPr>'
    $xml += '<w:tblStyle w:val="TableGrid"/>'
    $xml += '<w:tblW w:w="9355" w:type="dxa"/>'
    $xml += '<w:tblBorders>'
    foreach ($edge in @('top', 'left', 'bottom', 'right', 'insideH', 'insideV')) {
        $xml += '<w:' + $edge + ' w:val="single" w:sz="4" w:space="0" w:color="808080"/>'
    }
    $xml += '</w:tblBorders>'
    $xml += '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/>'
    $xml += '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar>'
    $xml += '<w:tblLayout w:type="fixed"/></w:tblPr>'
    $xml += '<w:tblGrid>'
    for ($i = 0; $i -lt $cols; $i++) {
        $xml += '<w:gridCol w:w="' + $widths[$i] + '"/>'
    }
    $xml += '</w:tblGrid>'

    $rowIndex = 0
    foreach ($row in $parsed) {
        $isHeader = ($rowIndex -eq 0)
        $xml += '<w:tr>'
        if ($isHeader) {
            $xml += '<w:trPr><w:tblHeader/></w:trPr>'
        }
        for ($i = 0; $i -lt $cols; $i++) {
            $cellText = ''
            if ($i -lt $row.Count) {
                $cellText = $row[$i].Trim()
            }
            $xml += '<w:tc><w:tcPr><w:tcW w:w="' + $widths[$i] + '" w:type="dxa"/>'
            if ($isHeader) {
                $xml += '<w:shd w:val="clear" w:color="auto" w:fill="EFEFEF"/>'
            }
            $xml += '</w:tcPr>'
            $cellParagraph = '<w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/>'
            if ($isHeader) {
                $cellParagraph += '<w:jc w:val="center"/>'
            }
            $cellParagraph += '</w:pPr>'
            $cellParagraph += (New-Run -Text $cellText -Size 24 -Bold:$isHeader)
            $cellParagraph += '</w:p>'
            $xml += $cellParagraph
            $xml += '</w:tc>'
        }
        $xml += '</w:tr>'
        $rowIndex++
    }

    $xml += '</w:tbl>'
    $xml += '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>'

    return $xml
}

$lines = Get-Content -Encoding UTF8 $sourceFile

$body = New-Object System.Text.StringBuilder

$inCode = $false
$inTable = $false
$tableRows = New-Object System.Collections.Generic.List[string]

foreach ($rawLine in $lines) {
    $line = $rawLine.TrimEnd()

    if ($line -eq '[code]') {
        $inCode = $true
        continue
    }
    if ($line -eq '[/code]') {
        $inCode = $false
        [void]$body.Append('<w:p><w:pPr><w:spacing w:before="0" w:after="180" w:line="240" w:lineRule="auto"/></w:pPr></w:p>')
        continue
    }
    if ($line -eq '[table]') {
        $inTable = $true
        $tableRows.Clear()
        continue
    }
    if ($line -eq '[/table]') {
        $inTable = $false
        [void]$body.Append((New-Table -Rows $tableRows.ToArray()))
        continue
    }

    if ($inTable) {
        $tableRows.Add($line)
        continue
    }

    if ($inCode) {
        if ($line -eq '') {
            [void]$body.Append('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:ind w:left="567"/><w:shd w:val="clear" w:color="auto" w:fill="F7F7F7"/></w:pPr></w:p>')
        }
        else {
            [void]$body.Append((New-Paragraph -Text $line -Alignment 'left' -FirstLine 0 -LeftIndent 567 -Line 240 -Font 'Courier New' -Size 18 -Shading 'F7F7F7'))
        }
        continue
    }

    if ($line -eq '') {
        continue
    }

    if ($line.StartsWith('# ')) {
        $text = $line.Substring(2)
        [void]$body.Append((New-Paragraph -Text $text -Style 'Heading1' -Alignment 'center' -FirstLine 0 -Before 0 -After 300 -Bold))
        continue
    }

    if ($line.StartsWith('## ')) {
        $text = $line.Substring(3)
        [void]$body.Append((New-Paragraph -Text $text -Style 'Heading2' -Alignment 'left' -FirstLine 0 -Before 280 -After 140 -Bold -KeepNext))
        continue
    }

    if ($line.StartsWith('### ')) {
        $text = $line.Substring(4)
        [void]$body.Append((New-Paragraph -Text $text -Style 'Heading3' -Alignment 'left' -FirstLine 0 -Before 220 -After 100 -Bold -KeepNext))
        continue
    }

    if ($line.StartsWith('- ')) {
        $text = '– ' + $line.Substring(2)
        [void]$body.Append((New-Paragraph -Text $text -FirstLine 0 -LeftIndent 709 -Hanging 425))
        continue
    }

    if ($line.StartsWith('[pic]')) {
        $caption = $line.Substring(5)
        [void]$body.Append((New-Paragraph -Text '[ место для скриншота ]' -Alignment 'center' -FirstLine 0 -Before 180 -After 60 -Italic -Size 24 -Color '808080'))
        [void]$body.Append((New-Paragraph -Text $caption -Alignment 'center' -FirstLine 0 -After 240 -Size 24))
        continue
    }

    [void]$body.Append((New-Paragraph -Text $line))
}

$sectPr = '<w:sectPr>'
$sectPr += '<w:footerReference w:type="default" r:id="rId2"/>'
$sectPr += '<w:pgSz w:w="11906" w:h="16838"/>'
$sectPr += '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/>'
$sectPr += '<w:cols w:space="708"/>'
$sectPr += '<w:docGrid w:linePitch="360"/>'
$sectPr += '</w:sectPr>'

$documentXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
$documentXml += '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
$documentXml += ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
$documentXml += '<w:body>' + $body.ToString() + $sectPr + '</w:body></w:document>'

$stylesXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/>
        <w:sz w:val="28"/>
        <w:szCs w:val="28"/>
        <w:lang w:val="ru-RU" w:eastAsia="ru-RU" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="360" w:lineRule="auto"/>
        <w:jc w:val="both"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="0" w:after="300" w:line="360" w:lineRule="auto"/>
      <w:jc w:val="center"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="280" w:after="140" w:line="360" w:lineRule="auto"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="220" w:after="100" w:line="360" w:lineRule="auto"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="28"/>
    </w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
</w:styles>
'@

$contentTypesXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>
'@

$relsXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'@

$documentRelsXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>
'@

$footerXml = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:ftr>
'@

Write-Utf8File -Path (Join-Path $buildDir '[Content_Types].xml') -Content $contentTypesXml
Write-Utf8File -Path (Join-Path $buildDir '_rels\.rels') -Content $relsXml
Write-Utf8File -Path (Join-Path $buildDir 'word\document.xml') -Content $documentXml
Write-Utf8File -Path (Join-Path $buildDir 'word\styles.xml') -Content $stylesXml
Write-Utf8File -Path (Join-Path $buildDir 'word\footer1.xml') -Content $footerXml
Write-Utf8File -Path (Join-Path $buildDir 'word\_rels\document.xml.rels') -Content $documentRelsXml

$tempZip = Join-Path $PSScriptRoot '_docx_build.zip'
if (Test-Path $tempZip) {
    Remove-Item $tempZip -Force
}
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$packageParts = @(
    @{ Entry = '[Content_Types].xml'; File = '[Content_Types].xml' },
    @{ Entry = '_rels/.rels'; File = '_rels\.rels' },
    @{ Entry = 'word/document.xml'; File = 'word\document.xml' },
    @{ Entry = 'word/styles.xml'; File = 'word\styles.xml' },
    @{ Entry = 'word/footer1.xml'; File = 'word\footer1.xml' },
    @{ Entry = 'word/_rels/document.xml.rels'; File = 'word\_rels\document.xml.rels' }
)

$zipStream = [System.IO.File]::Open($tempZip, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive(
    $zipStream,
    [System.IO.Compression.ZipArchiveMode]::Create
)

try {
    foreach ($part in $packageParts) {
        $sourcePath = Join-Path $buildDir $part.File
        $entry = $archive.CreateEntry(
            $part.Entry,
            [System.IO.Compression.CompressionLevel]::Optimal
        )
        $entryStream = $entry.Open()

        try {
            $bytes = [System.IO.File]::ReadAllBytes($sourcePath)
            $entryStream.Write($bytes, 0, $bytes.Length)
        }
        finally {
            $entryStream.Close()
        }
    }
}
finally {
    $archive.Dispose()
    $zipStream.Close()
}

Move-Item -Path $tempZip -Destination $outputFile -Force

$info = Get-Item $outputFile
Write-Output ('OK: ' + $info.FullName)
Write-Output ('size: ' + $info.Length + ' bytes')
