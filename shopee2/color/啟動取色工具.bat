@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul || (echo 找不到 python，請改用瀏覽器直接開啟 color-tool.html 並選擇資料夾。 ^& pause ^& exit /b)
start "" "http://localhost:8765/color-tool.html"
echo 取色工具已啟動，關閉此視窗即停止。
python -m http.server 8765
