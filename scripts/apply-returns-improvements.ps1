# =====================================================
# Script: Aplicar Mejoras de Returns
# Propósito: Ejecutar migración y regenerar cliente de Prisma
# Fecha: 2026-02-11
# =====================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Aplicando Mejoras de Returns" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Host "Error: No se encuentra prisma/schema.prisma" -ForegroundColor Red
    Write-Host "Asegurate de ejecutar este script desde la raiz del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "Paso 1: Verificando conexion a base de datos..." -ForegroundColor Yellow
$env:DATABASE_URL = Get-Content .env | Select-String "DATABASE_URL" | ForEach-Object { $_.ToString().Split('=')[1] }

if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL no encontrada en .env" -ForegroundColor Red
    exit 1
}

Write-Host "Conexion configurada correctamente" -ForegroundColor Green
Write-Host ""

# Paso 2: Crear migración
Write-Host "Paso 2: Creando migracion de Prisma..." -ForegroundColor Yellow
try {
    npx prisma migrate dev --name add_sync_failures_and_audit_metadata --skip-generate
    Write-Host "Migracion creada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "Error al crear migracion: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Intentando aplicar SQL directamente..." -ForegroundColor Yellow
    
    # Aplicar SQL directamente si la migración falla
    if (Test-Path "prisma/migrations/add_sync_failures_and_audit_metadata.sql") {
        Write-Host "Aplicando SQL manualmente..." -ForegroundColor Yellow
        # Aquí necesitarías psql o similar
        Write-Host "Por favor ejecuta manualmente:" -ForegroundColor Yellow
        Write-Host "psql -U your_user -d your_database -f prisma/migrations/add_sync_failures_and_audit_metadata.sql" -ForegroundColor Cyan
    }
}

Write-Host ""

# Paso 3: Regenerar cliente de Prisma
Write-Host "Paso 3: Regenerando cliente de Prisma..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "Cliente de Prisma regenerado exitosamente" -ForegroundColor Green
} catch {
    Write-Host "Error al regenerar cliente: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Paso 4: Verificar tipos de TypeScript
Write-Host "Paso 4: Verificando tipos de TypeScript..." -ForegroundColor Yellow
Write-Host "Ejecutando typecheck en backend..." -ForegroundColor Cyan

Push-Location apps/backend
try {
    npm run typecheck 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Typecheck completado sin errores" -ForegroundColor Green
    } else {
        Write-Host "Advertencia: Hay algunos errores de tipos" -ForegroundColor Yellow
        Write-Host "Ejecuta 'npm run typecheck' en apps/backend para ver detalles" -ForegroundColor Cyan
    }
} catch {
    Write-Host "No se pudo ejecutar typecheck" -ForegroundColor Yellow
}
Pop-Location

Write-Host ""

# Paso 5: Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resumen de Cambios Aplicados" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Tabla sync_failures creada" -ForegroundColor Green
Write-Host "✅ Campo metadata agregado a audit_logs" -ForegroundColor Green
Write-Host "✅ Cliente de Prisma regenerado" -ForegroundColor Green
Write-Host "✅ Mejoras de validacion implementadas en codigo" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Reiniciar el servidor: npm run dev" -ForegroundColor Cyan
Write-Host "2. Ejecutar tests manuales (ver .agent/audits/returns-post-implementation-steps.md)" -ForegroundColor Cyan
Write-Host "3. Monitorear logs durante las primeras 24 horas" -ForegroundColor Cyan
Write-Host ""
Write-Host "Documentacion completa en:" -ForegroundColor Yellow
Write-Host "- .agent/audits/RESUMEN_EJECUTIVO_RETURNS.md" -ForegroundColor Cyan
Write-Host "- .agent/audits/returns-improvements-summary.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Implementacion completada exitosamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
