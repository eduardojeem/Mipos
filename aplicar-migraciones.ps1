# Script para aplicar migraciones del sistema SaaS
# Fecha: 2026-02-15

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  APLICAR MIGRACIONES SAAS SYSTEM" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Navegar al directorio backend
Write-Host "[1/3] Navegando al directorio backend..." -ForegroundColor Yellow
Set-Location -Path "apps\backend" -ErrorAction Stop
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# Paso 2: Aplicar schema
Write-Host "[2/3] Aplicando schema de Prisma..." -ForegroundColor Yellow
Write-Host "Esto creara todas las tablas (core + SaaS)..." -ForegroundColor Gray
try {
    npx prisma db push --schema=..\..\prisma\schema.prisma
    if ($LASTEXITCODE -ne 0) {
        throw "Error al aplicar schema"
    }
    Write-Host "OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Fallo al aplicar el schema" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Set-Location -Path "..\..\"
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host ""

# Paso 3: Generar cliente
Write-Host "[3/3] Generando cliente de Prisma..." -ForegroundColor Yellow
try {
    npx prisma generate --schema=..\..\prisma\schema.prisma
    if ($LASTEXITCODE -ne 0) {
        throw "Error al generar cliente"
    }
    Write-Host "OK" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Fallo al generar el cliente" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Set-Location -Path "..\..\"
    Read-Host "Presiona Enter para salir"
    exit 1
}
Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Green
Write-Host "  MIGRACIONES APLICADAS EXITOSAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tablas creadas: 37 (32 core + 5 SaaS)" -ForegroundColor Cyan
Write-Host ""
Write-Host "SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "1. Insertar planes predefinidos (ver SOLUCION_ERROR_MIGRACIONES.md)" -ForegroundColor White
Write-Host "2. Iniciar backend: npm run dev" -ForegroundColor White
Write-Host "3. Iniciar frontend: npm run dev" -ForegroundColor White
Write-Host ""

# Preguntar si quiere abrir Prisma Studio
$response = Read-Host "¿Deseas abrir Prisma Studio para verificar? (S/N)"
if ($response -eq "S" -or $response -eq "s") {
    Write-Host "Abriendo Prisma Studio..." -ForegroundColor Yellow
    npx prisma studio --schema=..\..\prisma\schema.prisma
}

# Volver al directorio raíz
Set-Location -Path "..\..\"
Write-Host ""
Write-Host "Proceso completado." -ForegroundColor Green
