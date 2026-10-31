@echo off
title ShortForge - Servidor (NO CERRAR)
cd /d "%~dp0"
rem Si el servidor se cae por cualquier motivo, se vuelve a abrir solo en 5 segundos.
:inicio
node server.js
echo.
echo [ShortForge] El servidor se detuvo. Se reinicia solo en 5 segundos...
echo              (para apagar ShortForge de verdad, cierra esta ventana)
timeout /t 5 /nobreak >nul
goto inicio
