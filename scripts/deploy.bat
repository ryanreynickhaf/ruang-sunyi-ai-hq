@echo off
setlocal
call npm install || exit /b 1
call npx wrangler deploy || exit /b 1
echo.
echo Deploy selesai. Cek endpoint /health pada URL Worker.
pause
