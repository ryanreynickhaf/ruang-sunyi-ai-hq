@echo off
setlocal
where node >nul 2>nul || (echo [ERROR] Node.js belum terpasang. Install Node.js LTS lalu jalankan lagi.& pause & exit /b 1)
call npm install || exit /b 1
echo.
echo Login Cloudflare akan dibuka...
call npx wrangler login || exit /b 1
echo.
echo Selanjutnya set secrets satu per satu:
echo   npx wrangler secret put SUPABASE_URL
echo   npx wrangler secret put SUPABASE_SECRET_KEY
echo   npx wrangler secret put OPENROUTER_API_KEY
echo   npx wrangler secret put ADMIN_TOKEN
echo.
echo Setelah itu jalankan deploy.bat
pause
