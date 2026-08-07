@echo off
chcp 65001 >nul
setlocal

REM Project root = directory of this bat file
cd /d "%~dp0"

echo ========================================
echo   Job Agent · 一键启动
echo ========================================
echo.

if not exist "agent\main.py" (
  echo [错误] 未找到 agent\main.py，请确认目录结构。
  pause
  exit /b 1
)

echo [1/2] 启动 Agent 后端 ^(uvicorn :8000^)...
start "JobAgent-Backend" /D "%~dp0agent" cmd /k python -m uvicorn main:app --port 8000 --reload

echo [2/2] 启动前端 ^(Next.js^)...
if exist "pnpm-lock.yaml" (
  start "JobAgent-Frontend" /D "%~dp0" cmd /k pnpm dev
) else if exist "yarn.lock" (
  start "JobAgent-Frontend" /D "%~dp0" cmd /k yarn dev
) else (
  start "JobAgent-Frontend" /D "%~dp0" cmd /k npm run dev
)

echo.
echo Agent 后端与前端服务已成功启动！
echo   - 后端: http://127.0.0.1:8000
echo   - 前端: 请查看 Frontend 窗口（通常为 http://localhost:3000）
echo.
echo 关闭对应命令行窗口即可停止服务。
echo.
pause
endlocal
