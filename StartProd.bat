@echo off
start "Frontend" cmd /k "cd frontend && runSpanishTestFrontendProd.bat"
start "Backend" cmd /k "cd backend && runSpanishTestBackendProd.bat"
