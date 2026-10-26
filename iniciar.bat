@echo off
title WaveStudio Pro - Servidor Local
echo ========================================================
echo   WaveStudio Pro - Editor de Audio Multipista
echo ========================================================
echo.
echo Iniciando servidor local en el puerto 8080...
start http://localhost:8080/
python -m http.server 8080
pause
