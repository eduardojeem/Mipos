@echo off
echo ========================================
echo Reiniciando servidor de desarrollo
echo ========================================
echo.

cd apps\frontend

echo Limpiando cache de Next.js...
if exist .next (
    rmdir /s /q .next
    echo Cache eliminado
) else (
    echo No hay cache para eliminar
)

echo.
echo Iniciando servidor...
echo.
npm run dev
