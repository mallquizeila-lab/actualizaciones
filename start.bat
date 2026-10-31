@echo off
setlocal
title ShortForge
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Falta Node.js. Abre PowerShell y escribe:  winget install OpenJS.NodeJS.LTS
  echo         Luego cierra todo y abre este archivo otra vez.
  pause
  exit /b 1
)
where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Falta ffmpeg. Abre PowerShell y escribe:  winget install Gyan.FFmpeg
  echo         Luego cierra todo y abre este archivo otra vez.
  pause
  exit /b 1
)

rem Voces gratis de Microsoft Edge (necesitan Python). Se actualizan solas en cada inicio.
where python >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Falta Python: se usara la voz de Windows, que suena mas robotica.
  echo         Para voces naturales gratis, en PowerShell:  winget install Python.Python.3.12
  echo         y vuelve a abrir este archivo.
  timeout /t 6 >nul
) else (
  echo Actualizando voces de Edge...
  python -m pip install -U edge-tts --quiet --disable-pip-version-check
)


rem Cierra cualquier ShortForge viejo que siga usando el puerto 3200
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3200" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul
timeout /t 1 /nobreak >nul
start "ShortForge - Servidor (NO CERRAR)" cmd /k servidor.bat
timeout /t 3 /nobreak >nul
start "" http://localhost:3200
