$subnet = "10.32.64"
Write-Host "Scanning $subnet.0/24 for devices with port 80 open (HTTP servers like WLED)..."
Write-Host "This may take a minute..."
Write-Host ""

$found = @()
foreach ($i in 1..254) {
    $ip = "$subnet.$i"
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect($ip, 80, $null, $null)
        $wait = $result.AsyncWaitHandle.WaitOne(150)
        if ($wait -and $tcp.Connected) {
            Write-Host "FOUND: $ip has port 80 open" -ForegroundColor Green
            $found += $ip
        }
        $tcp.Close()
    } catch {}
}

Write-Host ""
if ($found.Count -eq 0) {
    Write-Host "No HTTP servers found on this subnet." -ForegroundColor Yellow
    Write-Host "The WLED board may be on a different subnet, or port 80 is blocked."
    
    Write-Host ""
    Write-Host "Also scanning 10.32.65.0/24..."
    foreach ($i in 1..254) {
        $ip = "10.32.65.$i"
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $result = $tcp.BeginConnect($ip, 80, $null, $null)
            $wait = $result.AsyncWaitHandle.WaitOne(150)
            if ($wait -and $tcp.Connected) {
                Write-Host "FOUND: $ip has port 80 open" -ForegroundColor Green
                $found += $ip
            }
            $tcp.Close()
        } catch {}
    }
} else {
    Write-Host "Found $($found.Count) device(s). Try each IP in your browser: http://IP_ADDRESS"
    Write-Host "The one showing the WLED interface is your board!"
}
