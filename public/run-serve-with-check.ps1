# npm install --global serve
# serve -s -p 4172 -L -u --no-port-switching
# 感觉没有必要压缩，本地不差这点速度
# 端口被占用就退出。不然有人可能不懂。这玩意缺少自动打开确实有点麻烦，https://github.com/vercel/serve/issues/792 ，有一段时间了，但是还没有处理
# --no-port-switching 参数被忽略了，6. https://github.com/vercel/serve/issues/751

$url = "http://localhost:4172"
$searchString = "工人考勤系统"

try {
    # 发送HTTP请求
    $response = Invoke-WebRequest -Uri $url -ErrorAction Stop
    
    # 检查响应内容是否包含指定字符串
    if ($response.Content -match $searchString) {
        Write-Host "前端已经启动成功"
        pause
        exit
    } else {
        Write-Host "前端端口被占用"
        pause
    }
} catch {
    serve -s -p 4172 -L -u --no-port-switching
    pause
}

