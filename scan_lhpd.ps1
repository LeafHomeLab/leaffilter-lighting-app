$subnet = "192.168.228"
Write-Host "Scanning $subnet.0/24 for WLED board (port 80)..."
Write-Host ""

$found = @()
foreach ($i in 1..254) {
    $ip = "$subnet.$i"
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect($ip, 80, $null, $null)
        $wait = $result.AsyncWaitHandle.WaitOne(150)
        if ($wait -and $tcp.Connected) {
            Write-Host "FOUND: $ip" -ForegroundColor Green
            $found += $ip
        }
        $tcp.Close()
    } catch {}
}

Write-Host ""
if ($found.Count -eq 0) {
    Write-Host "No HTTP servers found on $subnet.0/24" -ForegroundColor Yellow
} else {
    Write-Host "Found $($found.Count) device(s). Try each IP in your browser!" -ForegroundColor Cyan
}
