@echo off
REM Procura o storefront em portas locais comuns de preview (3000-3035 e 5000/5010/5020).
setlocal enabledelayedexpansion
set found=0
for /L %%P in (3000,1,3035) do (
    powershell -Command "if ((Test-NetConnection -ComputerName 'localhost' -Port %%P -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 0 } else { exit 1 }" >nul 2>&1
    if !errorlevel! == 0 (
        set PORT=%%P
        set found=1
        goto :OPENURLS
    )
)
for %%P in (5000 5010 5020) do (
    powershell -Command "if ((Test-NetConnection -ComputerName 'localhost' -Port %%P -WarningAction SilentlyContinue).TcpTestSucceeded) { exit 0 } else { exit 1 }" >nul 2>&1
    if !errorlevel! == 0 (
        set PORT=%%P
        set found=1
        goto :OPENURLS
    )
)

echo Nao encontrou servidor em localhost:3000-3035/5000/5010/5020. Execute `npm run dev` ou `pnpm dev` primeiro.
goto :EOF

:OPENURLS
echo Servidor local ativo em porta %PORT%. Abrindo URLs...
start "" "http://localhost:%PORT%/"
start "" "http://localhost:%PORT%/admin"
start "" "http://localhost:%PORT%/admin/kanban"
echo Abrindo:
echo  - http://localhost:%PORT%/
echo  - http://localhost:%PORT%/admin
echo  - http://localhost:%PORT%/admin/kanban
pause
endlocal
