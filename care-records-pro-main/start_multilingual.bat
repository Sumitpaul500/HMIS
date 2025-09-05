@echo off
echo Starting HMIS with Multilingual and Offline Support...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js 16 or higher
    pause
    exit /b 1
)

REM Install Python dependencies
echo Installing Python dependencies...
cd python_hmis
pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install Python dependencies
    pause
    exit /b 1
)
cd ..

REM Install Node.js dependencies
echo Installing Node.js dependencies...
npm install
if errorlevel 1 (
    echo Error: Failed to install Node.js dependencies
    pause
    exit /b 1
)

REM Start the Flask backend
echo Starting Flask backend...
start "HMIS Backend" cmd /k "cd python_hmis && python app.py"

REM Wait a moment for the backend to start
timeout /t 3 /nobreak >nul

REM Start the React frontend
echo Starting React frontend...
start "HMIS Frontend" cmd /k "npm run dev"

echo.
echo HMIS with Multilingual and Offline Support is starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:8080
echo.
echo Features:
echo - 7 Languages: English, Spanish, French, German, Hindi, Chinese, Arabic
echo - Offline Mode: Works without internet connection
echo - PWA Support: Can be installed as a native app
echo - Real-time Sync: Data syncs when connection is restored
echo.
echo Press any key to exit this window...
pause >nul
