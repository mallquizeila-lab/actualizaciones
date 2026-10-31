@echo off
setlocal
title ShortForge - Instalar IA local (Kokoro, Whisper, Chatterbox)
cd /d "%~dp0"
echo ============================================================
echo  Instala en tu PC (una sola vez, unos 3 GB):
echo   - Kokoro:     voz sin internet (respaldo de Edge)
echo   - Whisper:    subtitulos karaoke con tiempos reales
echo   - Chatterbox: clonar TU voz (o voces con permiso)
echo  Puede tardar 20-40 minutos. No cierres esta ventana.
echo ============================================================
where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Falta Python. En PowerShell:  winget install Python.Python.3.12
  pause
  exit /b 1
)
rem Se instala en tu carpeta de datos: no se pierde al actualizar ShortForge.
set "IA=%USERPROFILE%\ShortForge-datos\ia"
if not exist "%IA%\ia_local" mkdir "%IA%\ia_local"

rem Kokoro usa eSpeak NG para pronunciar en espanol.
where espeak-ng >nul 2>nul
if errorlevel 1 (
  echo Instalando eSpeak NG...
  winget install --accept-source-agreements --accept-package-agreements eSpeak-NG.eSpeak-NG
)

echo.
echo [1/4] Kokoro y Whisper...
if not exist "%IA%\.venv" python -m venv "%IA%\.venv"
"%IA%\.venv\Scripts\python" -m pip install -U pip --quiet
rem torch en version solo-CPU: mucho mas liviana (tu PC no tiene tarjeta NVIDIA)
"%IA%\.venv\Scripts\python" -m pip install torch --index-url https://download.pytorch.org/whl/cpu
"%IA%\.venv\Scripts\python" -m pip install "kokoro>=0.9.4" soundfile faster-whisper
"%IA%\.venv\Scripts\python" -c "import kokoro, soundfile" && echo ok> "%IA%\ia_local\kokoro.ok"
"%IA%\.venv\Scripts\python" -c "import faster_whisper" && echo ok> "%IA%\ia_local\whisper.ok"

echo.
set "PHONEMIZER_ESPEAK_LIBRARY=C:\Program Files\eSpeak NG\libespeak-ng.dll"
set "PATH=%PATH%;C:\Program Files\eSpeak NG"
echo [2/4] Descargando modelos (primera vez)...
"%IA%\.venv\Scripts\python" -c "from kokoro import KPipeline; KPipeline(lang_code='e')"
"%IA%\.venv\Scripts\python" -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"

echo.
echo [3/4] Chatterbox (clonar voz)...
if not exist "%IA%\motor_chatterbox" mkdir "%IA%\motor_chatterbox"
if not exist "%IA%\motor_chatterbox\venv" python -m venv "%IA%\motor_chatterbox\venv"
"%IA%\motor_chatterbox\venv\Scripts\python" -m pip install -U pip --quiet
"%IA%\motor_chatterbox\venv\Scripts\python" -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
"%IA%\motor_chatterbox\venv\Scripts\python" -m pip install chatterbox-tts
"%IA%\motor_chatterbox\venv\Scripts\python" -c "from chatterbox.mtl_tts import ChatterboxMultilingualTTS; ChatterboxMultilingualTTS.from_pretrained(device='cpu')" && echo ok> "%IA%\ia_local\chatterbox.ok"

echo.
echo [4/4] Demucs (separar la voz de la musica de fondo)...
"%IA%\motor_chatterbox\venv\Scripts\python" -m pip install demucs
"%IA%\motor_chatterbox\venv\Scripts\python" -c "from demucs.pretrained import get_model; get_model('htdemucs')" && echo ok> "%IA%\ia_local\demucs.ok"

echo.
echo ============================================================
if exist "%IA%\ia_local\kokoro.ok" (echo  [OK] Kokoro) else (echo  [X] Kokoro fallo - mandale a Claude el error de arriba)
if exist "%IA%\ia_local\whisper.ok" (echo  [OK] Whisper) else (echo  [X] Whisper fallo)
if exist "%IA%\ia_local\chatterbox.ok" (echo  [OK] Chatterbox) else (echo  [X] Chatterbox fallo)
if exist "%IA%\ia_local\demucs.ok" (echo  [OK] Demucs - quitar fondo) else (echo  [X] Demucs fallo)
echo ============================================================
echo Listo. Abre start.bat otra vez.
pause
