$subnet = "172.20.10"
Write-Host "Scanning hotspot $subnet.0/28 for WLED board..."
$found = @()
foreach ($i in 1..15) {
    $ip = "$subnet.$i"
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect($ip, 80, $null, $null)
        $wait = $result.AsyncWaitHandle.WaitOne(500)
        if ($wait -and $tcp.Connected) {
            Write-Host "FOUND: $ip" -ForegroundColor Green
            $found += $ip
        }
        $tcp.Close()
    } catch {}
}
if ($found.Count -eq 0) {
    Write-Host "No devices found" -ForegroundColor Yellow
} else {
    Write-Host "Found $($found.Count) device(s)!"
}
