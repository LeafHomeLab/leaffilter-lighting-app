# Verify board, then check current LED config
try {
    $info = Invoke-RestMethod -Uri "http://172.20.10.13/json/info" -TimeoutSec 5
    Write-Host "Board: $($info.name) | FW: $($info.ver) | LEDs: $($info.leds.count) | RGBW: $($info.leds.rgbw)" -ForegroundColor Green

    # Get current state
    $state = Invoke-RestMethod -Uri "http://172.20.10.13/json/state" -TimeoutSec 5
    $seg = $state.seg[0]
    Write-Host "Segment 0: fx=$($seg.fx), col=$($seg.col | ConvertTo-Json -Compress)" -ForegroundColor Cyan

    # Test solid GREEN
    $body = '{"on":true,"bri":128,"seg":[{"id":0,"col":[[0,255,0]],"fx":0}]}'
    $r = Invoke-RestMethod -Uri "http://172.20.10.13/json/state" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 5
    Write-Host "Sent solid GREEN to test!" -ForegroundColor Green
} catch {
    Write-Host "Failed: $($_.Exception.Message)" -ForegroundColor Red
}
