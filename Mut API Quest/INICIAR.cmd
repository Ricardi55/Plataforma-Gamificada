@echo off
setlocal
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if errorlevel 1 (
  echo Instala Node.js LTS y vuelve a abrir este archivo.
  pause
  exit /b 1
)
if not exist "node_modules\newman\index.js" (
  echo Instalando las dependencias del laboratorio Postman...
  call npm.cmd ci --ignore-scripts --no-audit --no-fund
  if errorlevel 1 (
    echo No se pudieron instalar las dependencias. Revisa tu conexion.
    pause
    exit /b 1
  )
)
echo Abre http://localhost:3000 en tu navegador.
echo Deja esta ventana abierta mientras usas la plataforma.
node server.js
pause
