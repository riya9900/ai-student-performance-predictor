@echo off
setlocal EnableExtensions
title AI Student Performance Predictor - Launcher
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

echo ==============================================
echo   AI Student Performance Predictor - Launcher
echo ==============================================
echo.

rem ---------- 1. Python (3.10 - 3.13, 3.12 preferred) ----------
set "PY="
for %%V in (3.12 3.11 3.13 3.10) do (
  if not defined PY (
    py -%%V --version >nul 2>&1 && set "PY=py -%%V"
  )
)
if defined PY goto :pyfound
python -c "import sys; sys.exit(0 if (3,10) <= sys.version_info[:2] <= (3,13) else 1)" >nul 2>&1
if not errorlevel 1 set "PY=python"
if not defined PY goto :wrongpython
:pyfound
set "PYV="
for /f "delims=" %%i in ('%PY% -c "import sys; print(sys.version_info.major*100+sys.version_info.minor)"') do set "PYV=%%i"
echo [OK] Using Python:
%PY% --version

rem ---------- 2. Node.js ----------
where node >nul 2>&1
if errorlevel 1 goto :nonode
where npm >nul 2>&1
if errorlevel 1 goto :nonode
echo [OK] Node.js found:
node --version

rem ---------- 3. Backend virtual environment ----------
pushd "%BACKEND%"
if not exist ".venv\Scripts\python.exe" goto :makevenv
set "VENVV="
for /f "delims=" %%i in ('.venv\Scripts\python.exe -c "import sys; print(sys.version_info.major*100+sys.version_info.minor)" 2^>nul') do set "VENVV=%%i"
if "%VENVV%"=="%PYV%" goto :venvok
echo.
echo [..] The existing backend\.venv was built with a different Python ^(version code "%VENVV%"^).
echo [..] Recreating it with the Python selected above ^(only this launcher-made folder is removed^)...
popd
rmdir /s /q "%BACKEND%\.venv"
pushd "%BACKEND%"
if exist ".venv" goto :venvdelfail
:makevenv
echo.
echo [..] Creating Python virtual environment ^(first run only^)...
%PY% -m venv .venv
if errorlevel 1 goto :venvfail
:venvok
echo.
echo [..] Installing backend dependencies ^(quick if already installed^)...
".venv\Scripts\python.exe" -m pip install --disable-pip-version-check --only-binary=:all: -q -r requirements.txt
if errorlevel 1 goto :pipfail
echo [..] Checking that the libraries can be loaded...
".venv\Scripts\python.exe" -c "import numpy, fastapi, uvicorn; print('[OK] Libraries load correctly.')"
if errorlevel 1 goto :importfail
popd
echo [OK] Backend dependencies ready.

rem ---------- 4. Model (shipped as portable models\model.npz - no training needed) ----------
if exist "%BACKEND%\models\model.npz" goto :modelok
echo.
echo [ERROR] backend\models\model.npz is missing. Re-download it from the GitHub repository.
goto :fail
:modelok
echo [OK] Model ready.

rem ---------- 5. Frontend dependencies ----------
if exist "%FRONTEND%\node_modules" goto :nodemodsok
echo.
echo [..] Installing frontend dependencies ^(first run only, can take a few minutes^)...
pushd "%FRONTEND%"
call npm install --no-audit --no-fund
if errorlevel 1 (
  popd
  goto :npmfail
)
popd
:nodemodsok
echo [OK] Frontend dependencies ready.

rem ---------- 6. Port check ----------
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 echo [!!] Port 8000 is already in use - close the other program or the backend may fail to start.
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if not errorlevel 1 echo [!!] Port 5173 is already in use - close the other program or the frontend may fail to start.

rem ---------- 7. Start servers in separate windows ----------
echo.
echo [..] Starting backend  ^(http://127.0.0.1:8000^)...
start "Student Predictor - BACKEND" /D "%BACKEND%" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
echo [..] Starting frontend ^(http://127.0.0.1:5173^)...
start "Student Predictor - FRONTEND" /D "%FRONTEND%" cmd /k "npm run dev"

echo.
echo Waiting a few seconds, then opening the browser...
timeout /t 8 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo.
echo ==============================================
echo   App:      http://127.0.0.1:5173
echo   API:      http://127.0.0.1:8000
echo   API docs: http://127.0.0.1:8000/docs
echo ==============================================
echo Close the two server windows to stop the app.
echo.
pause
exit /b 0

:wrongpython
echo [ERROR] No supported Python was found. This project supports Python 3.10 to 3.13 ^(3.12 is recommended^).
echo         Python 3.14 is not used by this launcher. Install Python 3.12 from https://www.python.org/downloads/
echo         ^(tick "Add python.exe to PATH"^) or run:  winget install -e --id Python.Python.3.12
echo         Then close this window and run start-app.bat again. Other Python versions can stay installed.
goto :fail
:nonode
echo [ERROR] Node.js ^(with npm^) was not found. Install the LTS version from https://nodejs.org/
echo         then close and reopen this window and run this file again.
goto :fail
:venvdelfail
echo [ERROR] Could not remove the old backend\.venv folder. Close any window that is using it ^(for example an
echo         old server window^), delete the backend\.venv folder manually, then run this file again.
popd
goto :fail
:venvfail
echo [ERROR] Could not create the Python virtual environment in backend\.venv
popd
goto :fail
:pipfail
echo [ERROR] Installing backend dependencies failed. Check your internet connection and the messages above.
popd
goto :fail
:importfail
popd
echo.
echo [ERROR] Python started, but a native library could not be loaded ^(see the message above^).
echo         If it mentions "Application Control", "blocked" or "DLL load failed", Windows security
echo         ^(Smart App Control, WDAC or AppLocker^) is blocking a file inside backend\.venv.
echo         This launcher does NOT try to get around that policy - please do not disable it for this project.
echo.
echo [..] Looking up which file Windows blocked ^(read-only; changes nothing^)...
powershell -NoProfile -Command "try { Get-WinEvent -LogName 'Microsoft-Windows-CodeIntegrity/Operational' -MaxEvents 300 -ErrorAction Stop | Where-Object { $_.Id -in 3033,3034,3076,3077 -and $_.Message -match 'venv|sklearn|scikit|vcomp|openmp' } | Select-Object -First 4 | ForEach-Object { Write-Host ($_.TimeCreated.ToString() + '  ' + $_.Message.Substring(0,[Math]::Min(450,$_.Message.Length))); Write-Host '' } } catch { Write-Host 'Could not read the log from here. Open Event Viewer instead.' }"
echo.
echo Next steps:
echo   1. Make sure the Python shown at the top is 3.12 ^(this launcher prefers it^). If not, install Python 3.12 and run this file again.
echo   2. If it still fails, send the blocked file name shown above ^(or from Event Viewer: Applications and Services Logs,
echo      Microsoft, Windows, CodeIntegrity, Operational^) to the owner or IT admin of this PC and ask for it to be allowed.
goto :fail
:npmfail
echo [ERROR] "npm install" failed in the frontend folder. Check your internet connection and the messages above.
goto :fail
:fail
echo.
pause
exit /b 1
