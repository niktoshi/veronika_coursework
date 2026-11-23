$bom = New-Object System.Text.UTF8Encoding($true)
$plain = New-Object System.Text.UTF8Encoding($false)

Get-ChildItem -Path $PSScriptRoot -Filter '*.ps1' | ForEach-Object {
    if ($_.Name -ne 'fix-encoding.ps1') {
        $text = [System.IO.File]::ReadAllText($_.FullName, $plain)
        [System.IO.File]::WriteAllText($_.FullName, $text, $bom)
        Write-Output ('BOM: ' + $_.Name)
    }
}
