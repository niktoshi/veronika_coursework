$source = 'C:\Users\Arishkaa\Desktop\courseWork Veronika\_tmp_docx\word\document.xml'
$target = 'C:\Users\Arishkaa\Desktop\courseWork Veronika\_tmp_docx.txt'

$text = Get-Content -Raw -Encoding UTF8 -LiteralPath $source

$text = $text -replace '</w:p>', [char]10
$text = $text -replace '<w:tab[^>]*/>', [char]9
$text = $text -replace '<w:br[^>]*/>', [char]10
$text = $text -replace '<[^>]+>', ''
$text = $text -replace '&lt;', '<'
$text = $text -replace '&gt;', '>'
$text = $text -replace '&quot;', '"'
$text = $text -replace '&apos;', "'"
$text = $text -replace '&amp;', '&'

Set-Content -LiteralPath $target -Value $text -Encoding UTF8
Write-Output (Get-Item -LiteralPath $target).Length
