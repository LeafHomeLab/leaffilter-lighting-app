# Get the full effects list from WLED
try {
    $effects = Invoke-RestMethod -Uri "http://172.20.10.13/json/effects" -TimeoutSec 5
    for ($i = 0; $i -lt $effects.Count; $i++) {
        Write-Host "$i : $($effects[$i])"
    }
    Write-Host "`nTotal effects: $($effects.Count)"
} catch {
    Write-Host "Failed: $($_.Exception.Message)"
}
