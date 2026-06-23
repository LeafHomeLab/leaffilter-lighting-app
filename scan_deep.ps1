# Try longer timeouts and also try ARP table
Write-Host "=== Checking ARP cache for 192.168.228.x devices ==="
arp -a | Select-String "192.168.228"

Write-Host ""
Write-Host "=== Trying board at old IP with 10s timeout ==="
try {
    $response = Invoke-WebRequest -Uri "http://192.168.228.170/json/info" -TimeoutSec 10 -UseBasicParsing
    Write-Host "SUCCESS at .170!" -ForegroundColor Green
} catch {
    Write-Host ".170 failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Quick scan .1-.254 with 500ms timeout ==="
$found = @()
foreach ($i in 1..254) {
    $ip = "192.168.228.$i"
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
if ($found.Count -eq 0) { Write-Host "No devices found with 500ms timeout" -ForegroundColor Red }
