@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
    py -3 src\app.py
) else (
    python src\app.py
)
pause
