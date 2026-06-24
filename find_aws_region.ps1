$ipStr = "2600:1f1e:75b:4b0a:9034:9337:6dd7:3116"
$url = "https://ip-ranges.amazonaws.com/ip-ranges.json"

Write-Host "Downloading AWS IP ranges..."
$data = Invoke-RestMethod -Uri $url

# Convert IP string to IPAddress object
$ip = [System.Net.IPAddress]::Parse($ipStr)

Write-Host "Searching through IPv6 prefixes..."
$matched = $false
foreach ($prefix in $data.ipv6_prefixes) {
    # We can check simple starts-with match for AWS IPv6 /36 or /32 or /48 subnets
    # A /36 network means the first 36 bits match. 
    # In hex, 36 bits is 9 hex characters (e.g. 2600:1f1e:7).
    # A /32 network is 8 hex characters (e.g. 2600:1f1e).
    # Let's parse the prefix
    $netStr = $prefix.ipv6_prefix
    $parts = $netStr.Split('/')
    $cidr = [int]$parts[1]
    $netAddr = $parts[0]
    
    # We will do a basic string match on the relevant blocks
    # e.g., if CIDR is 32, we match first 2 segments.
    # 2600:1f1e:75b:4b0a... -> 2600:1f1e is 2 segments (32 bits)
    # If CIDR is 36, we match 2 segments + part of 3rd
    $ipSegments = $ipStr.Split(':')
    $netSegments = $netAddr.Split(':')
    
    if ($cidr -eq 32 -and $ipSegments[0] -eq $netSegments[0] -and $ipSegments[1] -eq $netSegments[1]) {
        Write-Host "Match found (32-bit): $($prefix.region) - $($prefix.ipv6_prefix) - $($prefix.service)"
        $matched = $true
    } elseif ($cidr -eq 36 -and $ipSegments[0] -eq $netSegments[0] -and $ipSegments[1] -eq $netSegments[1]) {
        # Check if 3rd segment starts-with or matches
        # e.g. 75b. 36 bits is 2 segments (32) + 4 bits of 3rd segment (36).
        # Let's just output it to be sure
        Write-Host "Potential match (36-bit): $($prefix.region) - $($prefix.ipv6_prefix) - $($prefix.service)"
        $matched = $true
    } elseif ($cidr -gt 36 -and $ipSegments[0] -eq $netSegments[0] -and $ipSegments[1] -eq $netSegments[1] -and $ipSegments[2] -eq $netSegments[2]) {
        Write-Host "Deep Match found ($($cidr)-bit): $($prefix.region) - $($prefix.ipv6_prefix) - $($prefix.service)"
        $matched = $true
    }
}

if (-not $matched) {
    Write-Host "No match found."
}
