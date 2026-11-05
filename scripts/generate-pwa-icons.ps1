Add-Type -AssemblyName System.Drawing

$faviconPath = Resolve-Path "public\favicon.png"
$iconsDir = Resolve-Path "public\icons"
$publicDir = Resolve-Path "public"

function Resize-Image {
    param(
        [string]$sourcePath,
        [string]$destPath,
        [int]$width,
        [int]$height,
        [bool]$maskable = $false,
        [bool]$opaqueWhite = $false
    )

    $src = [System.Drawing.Bitmap]::FromFile($sourcePath)
    $dest = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($maskable -or $opaqueWhite) {
        # Fill background with pure white for maskable or iOS apple touch icon
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillRectangle($brush, 0, 0, $width, $height)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    if ($maskable) {
        # Safe zone for maskable icon: scale to 80% and center
        $scaledW = [int]($width * 0.80)
        $scaledH = [int]($height * 0.80)
        $offsetX = [int](($width - $scaledW) / 2)
        $offsetY = [int](($height - $scaledH) / 2)
        $g.DrawImage($src, $offsetX, $offsetY, $scaledW, $scaledH)
    } else {
        $g.DrawImage($src, 0, 0, $width, $height)
    }

    $g.Dispose()
    $src.Dispose()

    # Save as PNG
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
    Write-Output "Generated: $destPath ($width x $height)"
}

# 1. public/icons/icon-192.png
Resize-Image -sourcePath $faviconPath -destPath (Join-Path $iconsDir "icon-192.png") -width 192 -height 192

# 2. public/icons/icon-512.png
Resize-Image -sourcePath $faviconPath -destPath (Join-Path $iconsDir "icon-512.png") -width 512 -height 512

# 3. public/icons/icon-512-maskable.png
Resize-Image -sourcePath $faviconPath -destPath (Join-Path $iconsDir "icon-512-maskable.png") -width 512 -height 512 -maskable $true

# 4. public/icons/apple-touch-icon.png & public/apple-touch-icon.png (180x180)
Resize-Image -sourcePath $faviconPath -destPath (Join-Path $iconsDir "apple-touch-icon.png") -width 180 -height 180 -opaqueWhite $true
Resize-Image -sourcePath $faviconPath -destPath (Join-Path $publicDir "apple-touch-icon.png") -width 180 -height 180 -opaqueWhite $true

Write-Output "All icons generated successfully!"
