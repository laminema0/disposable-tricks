@echo off
rem Double-click to play Disposable Tricks. Keep this window open while you play; close it to stop the game.
cd /d "%~dp0.."
title Disposable Tricks
if not exist node_modules (
  echo Installing the game's parts. This happens only the first time...
  call npm install
)
rem Open the browser a few seconds from now, once the game has started.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:5183"
call npm run dev
pause
