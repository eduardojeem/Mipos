@echo off
echo ========================================
echo   APLICAR MIGRACIONES SAAS SYSTEM
echo ========================================
echo.

echo [1/3] Navegando al directorio backend...
cd apps\backend
if errorlevel 1 (
    echo ERROR: No se pudo acceder a apps\backend
    pause
    exit /b 1
)
echo OK
echo.

echo [2/3] Aplicando schema de Prisma...
echo Esto creara todas las tablas (core + SaaS)...
call npx prisma db push --schema=..\..\prisma\schema.prisma
if errorlevel 1 (
    echo ERROR: Fallo al aplicar el schema
    pause
    exit /b 1
)
echo OK
echo.

echo [3/3] Generando cliente de Prisma...
call npx prisma generate --schema=..\..\prisma\schema.prisma
if errorlevel 1 (
    echo ERROR: Fallo al generar el cliente
    pause
    exit /b 1
)
echo OK
echo.

echo ========================================
echo   MIGRACIONES APLICADAS EXITOSAMENTE
echo ========================================
echo.
echo Tablas creadas: 37 (32 core + 5 SaaS)
echo.
echo SIGUIENTE PASO:
echo 1. Insertar planes predefinidos (ver SOLUCION_ERROR_MIGRACIONES.md)
echo 2. Iniciar backend: npm run dev
echo 3. Iniciar frontend: npm run dev
echo.
echo Presiona cualquier tecla para abrir Prisma Studio...
pause > nul

call npx prisma studio --schema=..\..\prisma\schema.prisma

cd ..\..
