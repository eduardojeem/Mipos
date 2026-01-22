@echo off
REM Script batch para ejecutar los scripts de roles en Windows
REM Configura las variables de entorno y ejecuta los scripts TypeScript

REM Configurar variables de entorno desde .env
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /v "^#" ^| findstr "="') do (
    set "%%a=%%b"
)

REM Función para mostrar ayuda
if "%1"=="help" (
    echo.
    echo 🎯 Scripts de Gestión de Roles - Sistema POS
    echo.
    echo Uso: run-scripts.bat [comando] [opciones]
    echo.
    echo Comandos disponibles:
    echo   check                    Ver todos los usuarios y roles
    echo   check-role [ROLE]        Ver usuarios con rol específico
    echo   sync                     Sincronizar roles (dry-run)
    echo   sync-apply               Sincronizar roles (aplicar cambios)
    echo   assign [EMAIL] [ROLE]    Asignar rol a usuario
    echo   help                     Mostrar esta ayuda
    echo.
    echo Ejemplos:
    echo   run-scripts.bat check
    echo   run-scripts.bat check-role ADMIN
    echo   run-scripts.bat sync
    echo   run-scripts.bat assign usuario@empresa.com CASHIER
    echo.
    goto :eof
)

REM Verificar que las variables de entorno estén configuradas
if "%NEXT_PUBLIC_SUPABASE_URL%"=="" (
    echo ❌ Error: NEXT_PUBLIC_SUPABASE_URL no está configurada
    echo    Verifica que el archivo .env existe y contiene las variables necesarias
    exit /b 1
)

if "%SUPABASE_SERVICE_ROLE_KEY%"=="" (
    echo ❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada
    echo    Verifica que el archivo .env existe y contiene las variables necesarias
    exit /b 1
)

REM Ejecutar comandos según el parámetro
if "%1"=="check" (
    if "%2"=="" (
        echo 🔍 Verificando todos los usuarios y roles...
        npx tsx scripts/check-user-roles.ts --show-permissions
    ) else (
        echo 🔍 Verificando usuarios con información detallada...
        npx tsx scripts/check-user-roles.ts --show-permissions --verbose
    )
    goto :eof
)

if "%1"=="check-role" (
    if "%2"=="" (
        echo ❌ Error: Se requiere especificar el rol
        echo    Uso: run-scripts.bat check-role [ROLE]
        exit /b 1
    )
    echo 🔍 Verificando usuarios con rol %2...
    npx tsx scripts/check-user-roles.ts --role=%2 --show-permissions
    goto :eof
)

if "%1"=="sync" (
    echo 🔄 Sincronizando roles (modo dry-run)...
    npx tsx scripts/sync-roles-supabase-only.ts --dry-run --verbose
    goto :eof
)

if "%1"=="sync-apply" (
    echo 🔄 Sincronizando roles (aplicando cambios)...
    npx tsx scripts/sync-roles-supabase-only.ts --verbose
    goto :eof
)

if "%1"=="assign" (
    if "%2"=="" (
        echo ❌ Error: Se requiere email del usuario
        echo    Uso: run-scripts.bat assign [EMAIL] [ROLE]
        exit /b 1
    )
    if "%3"=="" (
        echo ❌ Error: Se requiere rol a asignar
        echo    Uso: run-scripts.bat assign [EMAIL] [ROLE]
        exit /b 1
    )
    echo 🎯 Asignando rol %3 al usuario %2...
    npx tsx scripts/assign-role.ts --email=%2 --role=%3 --verbose
    goto :eof
)

REM Si no se reconoce el comando, mostrar ayuda
echo ❌ Comando no reconocido: %1
echo.
echo Usa 'run-scripts.bat help' para ver los comandos disponibles
exit /b 1