# PowerShell script to download and parse nouns.csv
# Uses Unicode escape sequences to avoid script file encoding issues in PowerShell.
$url = "https://raw.githubusercontent.com/Badestrand/russian-dictionary/master/nouns.csv"
$tempCsv = "nouns.csv"

Write-Host "Downloading CSV from $url..."
Invoke-WebRequest -Uri $url -OutFile $tempCsv -UseBasicParsing

Write-Host "Processing CSV..."
# Read file lines with UTF8 encoding
$lines = Get-Content -Path $tempCsv -Encoding UTF8

if ($lines.Length -eq 0) {
    Write-Error "Failed to read lines or empty CSV file."
    exit 1
}

# Detect delimiter on first line
$firstLine = $lines[0]
$delimiter = ","
if ($firstLine.Contains("`t")) {
    $delimiter = "`t"
} elseif ($firstLine.Contains(";")) {
    $delimiter = ";"
}
Write-Host "Detected delimiter: [ $delimiter ]"

# Get the index of the 'bare' column or default to 0
$headers = $firstLine.Split($delimiter)
$bareIdx = 0
for ($i = 0; $i -lt $headers.Length; $i++) {
    $headerVal = $headers[$i].Trim().Replace('"', '').ToLower()
    if ($headerVal -eq "bare") {
        $bareIdx = $i
        break
    }
}
Write-Host "Found 'bare' column at index: $bareIdx"

# Use a case-insensitive HashSet to ensure uniqueness (using Russian culture collation)
$culture = [System.Globalization.CultureInfo]::CreateSpecificCulture("ru-RU")
$words = New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::Create($culture, $true))

# Regex pattern for exactly 5 Russian lowercase letters using Unicode escapes
# \u0430 is 'а', \u044f is 'я', \u0451 is 'ё'
$cyrillicPattern = "^[\u0430-\u044f\u0451]{5}$"

# Process line by line starting from line 1 (skipping header)
for ($i = 1; $i -lt $lines.Length; $i++) {
    $line = $lines[$i].Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    $cols = $line.Split($delimiter)
    if ($cols.Length -le $bareIdx) { continue }
    
    $word = $cols[$bareIdx].Trim().Replace('"', '').ToLower()
    
    # Filter exactly 5 Cyrillic letters
    if ($word -match $cyrillicPattern) {
        [void]$words.Add($word)
    }
}

# Sort alphabetically in Russian
$sortedWords = New-Object System.Collections.Generic.List[string]($words)
$sortedWords.Sort([System.StringComparer]::Create($culture, $true))

Write-Host "Found $($sortedWords.Count) unique, valid 5-letter Russian nouns."

# Convert to JSON array
$json = $sortedWords | ConvertTo-Json -Compress

# Create dictionary.js content using Here-String to avoid escaping issues
$jsContent = @"
// Dictionary of Russian 5-letter nouns. Source: Badestrand (CC BY-SA 4.0)
const WORDS = $json;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WORDS;
}
"@

# Write output file in UTF8
[System.IO.File]::WriteAllText((Join-Path (Get-Location) "dictionary.js"), $jsContent, [System.Text.Encoding]::UTF8)

# Clean up nouns.csv
Remove-Item $tempCsv
Write-Host "dictionary.js generated successfully with $($sortedWords.Count) words!"
