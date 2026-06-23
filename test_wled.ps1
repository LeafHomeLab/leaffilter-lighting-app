# Re-test first 5 effects with 8 second viewing each
$colors = @(@(213,0,0), @(255,255,255), @(21,101,192))

$tests = @(
    @{ num = 1; name = "Solid Pattern Tri (84)"; fx = 84 },
    @{ num = 2; name = "Tri Wipe (55)";          fx = 55 },
    @{ num = 3; name = "Tri Fade (56)";          fx = 56 },
    @{ num = 4; name = "Chase 3 (54)";           fx = 54 },
    @{ num = 5; name = "Running Dual (52)";      fx = 52 }
)

foreach ($test in $tests) {
    $body = @{
        on = $true; bri = 128
        seg = @(@{ id = 0; col = $colors; fx = $test.fx; sx = 128; ix = 128; pal = 0 })
    } | ConvertTo-Json -Depth 5

    try {
        Invoke-RestMethod -Uri "http://172.20.10.13/json/state" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 5 | Out-Null
        Write-Host "#$($test.num): $($test.name) -- WATCH NOW (8 sec)..." -ForegroundColor Cyan
        Start-Sleep -Seconds 8
    } catch {
        Write-Host "FAILED: $($test.name)" -ForegroundColor Red
    }
}

Write-Host "`nDone! Which numbers showed Red, White, AND Blue?" -ForegroundColor Green
