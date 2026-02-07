@echo off
start "Frontend" cmd /k "cd frontend && runSpanishTestFrontendDev.bat"
start "Backend" cmd /k "cd backend && runSpanishTestBackendDev.bat"
