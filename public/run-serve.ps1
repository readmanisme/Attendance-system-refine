# npm install --global serve
serve -s -p 4172 -L -u --no-port-switching
# 感觉没有必要压缩，本地不差这点速度
# 端口被占用就退出。不然有人可能不懂。这玩意缺少自动打开确实有点麻烦，https://github.com/vercel/serve/issues/792 ，有一段时间了，但是还没有处理