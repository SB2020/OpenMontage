@echo off
setlocal

set "ROOT=%~dp0"
set "HERMES=%LOCALAPPDATA%\hermes\node\node.exe"

if not exist "%HERMES%" (
  echo ANIMILL requires Hermes Node 22.12 or newer.
  echo Expected runtime: "%HERMES%"
  exit /b 1
)

cd /d "%ROOT%"
echo Starting ANIMILL from %ROOT%
"%HERMES%" "%ROOT%server.mjs"
