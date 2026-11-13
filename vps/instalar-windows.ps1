# ☁️ Instalador de ShortForge + Yupitok en un VPS con Windows (Windows Server 2016/2019/2022 o Windows 10/11).
# Uso: abre PowerShell COMO ADMINISTRADOR en el VPS y pega:
#   irm https://raw.githubusercontent.com/mallquizeila-lab/actualizaciones/main/vps/instalar-windows.ps1 | iex
# Qué hace: instala Node.js 22, FFmpeg y Python 3.12 (y las voces de Edge), descarga ShortForge en C:\ShortForge,
# usa tus datos en C:\ShortForge-datos y deja ShortForge como tarea que arranca sola al prender el VPS (aunque nadie entre)
# y se vuelve a levantar si se cae. Tus claves NUNCA salen del VPS.
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
function Paso($t) { Write-Host "`n== $t ==" -ForegroundColor Cyan }
function Ok($t) { Write-Host "   OK: $t" -ForegroundColor Green }
function RefrescarPath { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { Write-Host 'Abre PowerShell con clic derecho -> "Ejecutar como administrador" y vuelve a pegar el comando.' -ForegroundColor Red; return }
$tmp = Join-Path $env:TEMP 'sf-instalar'; New-Item -ItemType Directory -Force $tmp | Out-Null
$PROG = 'C:\ShortForge'; $DATOS = 'C:\ShortForge-datos'

Paso '1/6 Node.js 22'
RefrescarPath
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  $sum = (Invoke-WebRequest 'https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt' -UseBasicParsing).Content
  $msi = ($sum -split "`n" | Where-Object { $_ -match 'node-v[\d.]+-x64\.msi' } | ForEach-Object { ($_.Trim() -split '\s+')[1] } | Select-Object -First 1)
  Invoke-WebRequest "https://nodejs.org/dist/latest-v22.x/$msi" -OutFile "$tmp\node.msi" -UseBasicParsing
  Start-Process msiexec.exe -ArgumentList "/i `"$tmp\node.msi`" /qn /norestart" -Wait
  RefrescarPath
}
Ok (node -v)

Paso '2/6 FFmpeg'
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  Invoke-WebRequest 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile "$tmp\ffmpeg.zip" -UseBasicParsing
  if (Test-Path "$tmp\ff") { Remove-Item "$tmp\ff" -Recurse -Force }
  Expand-Archive "$tmp\ffmpeg.zip" -DestinationPath "$tmp\ff" -Force
  $dir = Get-ChildItem "$tmp\ff" -Directory | Select-Object -First 1
  if (Test-Path 'C:\ffmpeg') { Remove-Item 'C:\ffmpeg' -Recurse -Force }
  Move-Item $dir.FullName 'C:\ffmpeg'
  $mp = [Environment]::GetEnvironmentVariable('Path', 'Machine'); if ($mp -notlike '*C:\ffmpeg\bin*') { [Environment]::SetEnvironmentVariable('Path', "$mp;C:\ffmpeg\bin", 'Machine') }
  RefrescarPath
}
Ok 'ffmpeg listo'

Paso '3/6 Python 3.12 y voces de Edge'
if (-not (Get-Command python -ErrorAction SilentlyContinue) -or ((python --version 2>&1) -notmatch 'Python 3')) {
  Invoke-WebRequest 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-amd64.exe' -OutFile "$tmp\python.exe" -UseBasicParsing
  Start-Process "$tmp\python.exe" -ArgumentList '/quiet InstallAllUsers=1 PrependPath=1 Include_test=0' -Wait
  RefrescarPath
}
python -m pip install -U edge-tts --quiet --disable-pip-version-check 2>$null
Ok (python --version 2>&1)

Paso '4/6 Descargando ShortForge'
Invoke-WebRequest 'https://codeload.github.com/mallquizeila-lab/actualizaciones/zip/refs/heads/main' -OutFile "$tmp\sf.zip" -UseBasicParsing
if (Test-Path "$tmp\sf") { Remove-Item "$tmp\sf" -Recurse -Force }
Expand-Archive "$tmp\sf.zip" -DestinationPath "$tmp\sf" -Force
$src = Get-ChildItem "$tmp\sf" -Directory | Select-Object -First 1
New-Item -ItemType Directory -Force $PROG | Out-Null
Copy-Item "$($src.FullName)\*" $PROG -Recurse -Force
Ok "ShortForge en $PROG (versión $(Get-Content "$PROG\VERSION"))"

Paso '5/6 Tus datos'
[Environment]::SetEnvironmentVariable('SHORTFORGE_DATA', $DATOS, 'Machine'); $env:SHORTFORGE_DATA = $DATOS
if (Test-Path "$DATOS\.env") { Ok "Encontré tus datos en $DATOS (claves, canales, videos y la página)" }
else { New-Item -ItemType Directory -Force $DATOS | Out-Null; Write-Host "   AVISO: aún no copiaste tu carpeta ShortForge-datos. Cópiala a $DATOS (con ShortForge CERRADO en tu PC) y reinicia la tarea con:  Start-ScheduledTask ShortForge" -ForegroundColor Yellow }

Paso '6/6 Arranque automático (al prender el VPS, sin iniciar sesión)'
$bat = "$PROG\servidor-vps.bat"
@"
@echo off
cd /d "$PROG"
set SHORTFORGE_DATA=$DATOS
:inicio
node server.js >> "$DATOS\shortforge-vps.log" 2>&1
timeout /t 5 /nobreak >nul
goto inicio
"@ | Set-Content -Path $bat -Encoding ASCII
Unregister-ScheduledTask -TaskName 'ShortForge' -Confirm:$false -ErrorAction SilentlyContinue
$accion = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$bat`"" -WorkingDirectory $PROG
$disparo = New-ScheduledTaskTrigger -AtStartup
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
$quien = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName 'ShortForge' -Action $accion -Trigger $disparo -Settings $ajustes -Principal $quien | Out-Null
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName 'ShortForge'
# Acceso directo para abrir el panel (NO uses start.bat en el VPS: la tarea ya lo mantiene prendido)
$lnk = "$([Environment]::GetFolderPath('CommonDesktopDirectory'))\Abrir ShortForge.url"
"[InternetShortcut]`r`nURL=http://localhost:3200/" | Set-Content $lnk -Encoding ASCII
# El VPS nunca debe suspenderse
powercfg /change standby-timeout-ac 0 2>$null; powercfg /change hibernate-timeout-ac 0 2>$null
Start-Sleep -Seconds 12
try { Invoke-WebRequest 'http://localhost:3200/' -UseBasicParsing -TimeoutSec 10 | Out-Null; Ok 'ShortForge está corriendo' } catch { Write-Host "   Todavía arrancando. Si no abre en 1 minuto, mira el registro: $DATOS\shortforge-vps.log" -ForegroundColor Yellow }
Write-Host "`n✅ ¡LISTO! Abre el acceso directo 'Abrir ShortForge' del escritorio (o http://localhost:3200)." -ForegroundColor Green
Write-Host '   ShortForge y yupitok.com quedan prendidos aunque cierres el Escritorio remoto o el VPS se reinicie.' -ForegroundColor Green
Write-Host '   IMPORTANTE: en tu PC ya no abras ShortForge con la página encendida (si no, los dos se pelean el dominio).' -ForegroundColor Yellow
