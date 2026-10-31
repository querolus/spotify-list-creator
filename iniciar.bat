@echo off
REM Lanza la web app en http://127.0.0.1:8888/ (necesario para el login de Spotify)
cd /d "%~dp0"
start "" "http://127.0.0.1:8888/"
python -m http.server 8888 --bind 127.0.0.1

