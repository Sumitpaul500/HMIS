@echo off
echo.
echo ====================================
echo    HMIS Flask Server Launcher
echo ====================================
echo.
echo Starting HMIS Backend Server...
echo Server will be available at: http://localhost:5000
echo Open hmis-standalone.html in your browser for the frontend
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0python_hmis"

if not exist "app.py" (
    echo Error: app.py not found in python_hmis directory!
    echo Please make sure you're running this from the correct location.
    pause
    exit /b 1
)

set FLASK_APP=app.py
set FLASK_ENV=development
set FLASK_DEBUG=1

python -m flask run --host=0.0.0.0 --port=5000

echo.
echo Server stopped.
pause
