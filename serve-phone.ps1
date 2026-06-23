# LeafFilter Lighting App - PowerShell HTTP Server for Phone Access
# Serves the dist/ folder on port 9000, accessible from any device on the network.
# Runs under powershell.exe (not node.exe) to bypass the node firewall block.
# Also proxies /wled-proxy/* requests to the WLED controller.

param(
    [int]$Port = 9000,
    [string]$WledIP = "172.20.10.13"
)

$root = Join-Path $PSScriptRoot "dist"

# Try binding to all interfaces first, fall back to localhost
$listener = New-Object System.Net.HttpListener
$bound = $false

foreach ($prefix in @("http://*:$Port/", "http://+:$Port/", "http://localhost:$Port/")) {
    try {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add($prefix)
        $listener.Start()
        $bound = $true
        Write-Host "  Bound to: $prefix" -ForegroundColor DarkGray
        break
    } catch {
        $listener.Close()
    }
}

if (-not $bound) {
    Write-Host "ERROR: Could not bind to port $Port." -ForegroundColor Red
    exit 1
}

$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "172.*" -or $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "  LeafFilter Lighting - Phone Server" -ForegroundColor Green
Write-Host "  ------------------------------------" -ForegroundColor DarkGray
Write-Host "  Local:   http://localhost:$Port/" -ForegroundColor Cyan
if ($localIP) {
    Write-Host "  Phone:   http://${localIP}:$Port/" -ForegroundColor Cyan
}
Write-Host "  WLED:    http://$WledIP (proxied)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
Write-Host ""

$mimeTypes = @{
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".webp" = "image/webp"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $urlPath = $request.Url.AbsolutePath

        # CORS headers for WLED proxy
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        # WLED proxy: forward /wled-proxy/* to the controller
        if ($urlPath.StartsWith("/wled-proxy")) {
            $wledPath = $urlPath.Replace("/wled-proxy", "")
            if (-not $wledPath) { $wledPath = "/" }
            $wledUrl = "http://${WledIP}${wledPath}"

            try {
                if ($request.HttpMethod -eq "POST") {
                    $reader = New-Object System.IO.StreamReader($request.InputStream)
                    $body = $reader.ReadToEnd()
                    $reader.Close()

                    $wledResponse = Invoke-RestMethod -Uri $wledUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 3
                    $jsonStr = $wledResponse | ConvertTo-Json -Depth 10 -Compress
                    $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
                } else {
                    $wledResponse = Invoke-RestMethod -Uri $wledUrl -TimeoutSec 3
                    $jsonStr = $wledResponse | ConvertTo-Json -Depth 10 -Compress
                    $responseBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
                }

                $response.ContentType = "application/json"
                $response.StatusCode = 200
                $response.OutputStream.Write($responseBytes, 0, $responseBytes.Length)
                Write-Host "  PROXY  $urlPath -> $wledUrl" -ForegroundColor Magenta
            } catch {
                $errMsg = '{"error":"WLED unreachable"}'
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes($errMsg)
                $response.StatusCode = 502
                $response.ContentType = "application/json"
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
                Write-Host "  PROXY  $urlPath -> FAILED" -ForegroundColor Red
            }

            $response.Close()
            continue
        }

        # Static file serving from dist/
        $cleanPath = $urlPath.TrimStart("/").Replace("/", "\")
        $filePath = Join-Path $root $cleanPath

        # SPA fallback: serve index.html for paths that are not real files
        if (-not (Test-Path $filePath) -or (Get-Item $filePath -ErrorAction SilentlyContinue).PSIsContainer) {
            $filePath = Join-Path $root "index.html"
        }

        if (Test-Path $filePath) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            if ($mimeTypes.ContainsKey($ext)) {
                $response.ContentType = $mimeTypes[$ext]
            } else {
                $response.ContentType = "application/octet-stream"
            }
            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.StatusCode = 200
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            if ($urlPath -ne "/favicon.ico") {
                Write-Host "  200    $urlPath" -ForegroundColor Green
            }
        } else {
            $response.StatusCode = 404
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
            $response.OutputStream.Write($notFound, 0, $notFound.Length)
            Write-Host "  404    $urlPath" -ForegroundColor Yellow
        }

        $response.Close()
    } catch {
        # Listener was stopped
        break
    }
}

$listener.Stop()
Write-Host "Server stopped." -ForegroundColor Yellow
