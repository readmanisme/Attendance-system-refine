
try {
    
    $response = Invoke-WebRequest -Uri 'http://localhost:29401/api/health' -UseBasicParsing
    $json = $response.Content | ConvertFrom-Json

    if ($json.message -eq 'API is healthy.') {
        Write-Host "后端已经启动"
        pause
        exit 0
    } else {
        Write-Host "后端端口被占用"
        pause
        exit 0
    }
} 
catch {
    .\pocketbase.exe serve --http 127.0.0.1:29401
    pause
    }



