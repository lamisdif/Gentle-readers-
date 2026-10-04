# PowerShell mirror of scripts/build-cms-books.cjs
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$SrcDir = Join-Path $Root "src\data\books"
$OutFile = Join-Path $Root "public\cms-books.json"
$SettingsSrc = Join-Path $Root "src\data\settings.json"
$SettingsOut = Join-Path $Root "public\settings.json"

if (Test-Path $SettingsSrc) {
    Copy-Item -Path $SettingsSrc -Destination $SettingsOut -Force
    Write-Host "Copied settings.json to public/settings.json"
}

if (-not (Test-Path $SrcDir)) {
    Set-Content -Path $OutFile -Value "[]`n" -Encoding UTF8
    exit 0
}

function Parse-Discount($data) {
    if (-not $data) { return $null }

    $disc = $null
    if ($data.discount -is [System.Array] -and $data.discount.Count -gt 0) {
        $disc = $data.discount[0]
    } elseif ($data.discount -and ($data.discount -is [PSCustomObject] -or $data.discount -is [System.Collections.IDictionary])) {
        $disc = $data.discount
    }

    if ($disc -and ($disc.active -eq $false -or $disc.enabled -eq $false)) {
        return $null
    }

    if (-not $disc -and ($null -ne $data.discount_price -or $null -ne $data.sale_price)) {
        $disc = [PSCustomObject]@{
            original_price = if ($null -ne $data.original_price) { $data.original_price } else { $data.price }
            discount_price = if ($null -ne $data.discount_price) { $data.discount_price } else { $data.sale_price }
            percentage     = $data.discount_percentage
            label          = $data.discount_label
        }
    }

    if (-not $disc) { return $null }

    $rawDiscPrice = if ($null -ne $disc.discount_price) { $disc.discount_price } else { $disc.sale_price }
    if ($null -eq $rawDiscPrice -or "$rawDiscPrice" -eq "") {
        return $null
    }

    $discountPrice = 0
    if (-not [double]::TryParse("$rawDiscPrice", [ref]$discountPrice) -or $discountPrice -le 0) {
        return $null
    }

    $basePrice = 0
    [double]::TryParse("$($data.price)", [ref]$basePrice) | Out-Null

    $rawOrigPrice = if ($null -ne $disc.original_price -and "$($disc.original_price)" -ne "") { $disc.original_price } else { $basePrice }
    $originalPrice = 0
    if (-not [double]::TryParse("$rawOrigPrice", [ref]$originalPrice) -or $originalPrice -le 0) {
        $originalPrice = $basePrice
    }

    $percentage = 0
    if ($null -ne $disc.percentage -and "$($disc.percentage)" -ne "") {
        [double]::TryParse("$($disc.percentage)", [ref]$percentage) | Out-Null
    }
    if ($percentage -le 0 -and $originalPrice -gt $discountPrice -and $originalPrice -gt 0) {
        $percentage = [math]::Round((($originalPrice - $discountPrice) / $originalPrice) * 100)
    }

    $label = if ($null -ne $disc.label) { "$($disc.label)".Trim() } else { "" }
    if (-not $label -and $percentage -gt 0) {
        $label = "-$percentage%"
    }

    return [PSCustomObject]@{
        original_price = if ($originalPrice -gt 0) { $originalPrice } else { $discountPrice }
        discount_price = $discountPrice
        percentage     = $percentage
        label          = $label
    }
}

$files = Get-ChildItem -Path $SrcDir -Filter "*.json" | Where-Object { $_.Name.ToLower() -ne "index.json" }
$books = [System.Collections.Generic.List[PSCustomObject]]::new()

foreach ($f in $files) {
    try {
        $raw = Get-Content -Path $f.FullName -Raw -Encoding UTF8
        $data = $raw | ConvertFrom-Json
    } catch {
        continue
    }
    if (-not $data) { continue }

    $slug = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
    $createdTime = 0
    if ($data.date) {
        try {
            $createdTime = [DateTimeOffset]::Parse($data.date).ToUnixTimeMilliseconds()
        } catch {}
    }
    if (-not $createdTime) {
        $createdTime = [DateTimeOffset]::new($f.LastWriteTimeUtc).ToUnixTimeMilliseconds()
    }

    $img = if ($data.image) { "$($data.image)" } else { "" }
    if ($img.StartsWith("/")) {
        $img = $img.Substring(1)
    }

    $discInfo = Parse-Discount $data

    $stockVal = 10
    if ($null -ne $data.stock) {
        [int]::TryParse("$($data.stock)", [ref]$stockVal) | Out-Null
    }

    $effectivePrice = if ($discInfo) { $discInfo.discount_price } elseif ($null -ne $data.price) { $data.price } else { "" }
    $origPrice = if ($discInfo) { $discInfo.original_price } elseif ($null -ne $data.price) { $data.price } else { "" }

    $bookObj = [PSCustomObject]@{
        slug                = $slug
        title               = if ($data.title) { "$($data.title)" } else { "" }
        author              = if ($data.author) { "$($data.author)" } else { "Unknown Author" }
        price               = $effectivePrice
        original_price      = $origPrice
        discount_price      = if ($discInfo) { $discInfo.discount_price } else { $null }
        discount_percentage = if ($discInfo) { $discInfo.percentage } else { $null }
        discount_label      = if ($discInfo) { $discInfo.label } else { "" }
        has_discount        = [bool]($null -ne $discInfo)
        discount            = $discInfo
        status              = if ($data.status) { "$($data.status)" } else { "available" }
        stock               = $stockVal
        featured            = [bool]($data.featured)
        description         = if ($data.description) { "$($data.description)" } else { "" }
        image               = $img
        draft               = [bool]($data.draft)
        createdTime         = $createdTime
    }

    $books.Add($bookObj)
}

$published = $books | Where-Object { -not $_.draft }
$sorted = $published | Sort-Object -Property @{ Expression = "createdTime"; Descending = $true }, @{ Expression = "title"; Descending = $false }

$json = $sorted | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($OutFile, $json + "`n", [System.Text.Encoding]::UTF8)
Write-Host "Wrote $($sorted.Count) CMS books to public/cms-books.json"
