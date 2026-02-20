@echo off
echo ========================================
echo Stopping all services...
echo ========================================

REM Kill any existing Mosquitto processes
taskkill /F /IM mosquitto.exe >nul 2>&1

REM Kill Python TTS server
taskkill /F /FI "WINDOWTITLE eq TTS*" >nul 2>&1

echo.
echo ========================================
echo Starting services...
echo ========================================

echo.
echo [1/2] Starting Mosquitto MQTT Broker...
start "Mosquitto MQTT" "C:\Program Files\mosquitto\mosquitto.exe" -c "%~dp0mosquitto.conf" -v

timeout /t 2 >nul

echo [2/2] Starting TTS Server...
start "TTS Server" python "%~dp0tts_server.py"

timeout /t 3 >nul

echo.
echo ========================================
echo Services Started!
echo ========================================
echo.
echo Mosquitto MQTT: Running on ports 1883, 9001
echo TTS Server: Running on port 8000
echo.
echo Dashboard: http://localhost:3000
echo.
echo Press any key to exit...
pause >nul
