@echo off
rem House Planner - opens the app in its own window (no visible browser).
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0launcher\houseplanner.ps1"
