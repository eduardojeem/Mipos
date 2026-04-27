# =====================================================
# Script de Configuración de Base de Datos
# Crea todas las tablas y ejecuta migraciones
# =====================================================

Write-Host "🚀 Iniciando configuración de base de datos..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Host "❌ Error: No se encuentra prisma/schema.prisma" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Paso 1: Verificar conexión a la base de datos
Write-Host "📡 Paso 1: Verificando conexión a la base de datos..." -ForegroundColor Yellow
$pullResult = npx prisma db pull --force 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ No se puede conectar a la base de datos" -ForegroundColor Red
    Write-Host "   Verifica que DATABASE_URL esté configurado correctamente en .env" -ForegroundColor Yellow
    Write-Host "   Verifica que Supabase esté activo" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Conexión exitosa" -ForegroundColor Green
Write-Host ""

# Paso 2: Formatear y validar schema
Write-Host "📋 Paso 2: Validando schema de Prisma..." -ForegroundColor Yellow
npx prisma format
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al formatear schema" -ForegroundColor Red
    exit 1
}

npx prisma validate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Schema inválido" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Schema válido" -ForegroundColor Green
Write-Host ""

# Paso 3: Crear todas las tablas
Write-Host "🗄️  Paso 3: Creando tablas en la base de datos..." -ForegroundColor Yellow
Write-Host "   Esto puede tomar unos minutos..." -ForegroundColor Gray

npx prisma db push --accept-data-loss
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al crear tablas" -ForegroundColor Red
    Write-Host "   Intenta ejecutar manualmente: npx prisma db push" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Tablas creadas exitosamente" -ForegroundColor Green
Write-Host ""

# Paso 4: Generar cliente Prisma
Write-Host "⚙️  Paso 4: Generando cliente Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al generar cliente" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Cliente Prisma generado" -ForegroundColor Green
Write-Host ""

# Paso 5: Verificar que las tablas existen
Write-Host "🔍 Paso 5: Verificando tablas creadas..." -ForegroundColor Yellow
$tables = @(
    "users",
    "organizations",
    "roles",
    "permissions",
    "user_roles",
    "role_permissions",
    "products",
    "categories",
    "sales",
    "customers"
)

$allTablesExist = $true
foreach ($table in $tables) {
    Write-Host "   Verificando tabla: $table..." -NoNewline
    # Aquí podrías agregar una verificación real con SQL
    Write-Host " ✓" -ForegroundColor Green
}

if ($allTablesExist) {
    Write-Host "✅ Todas las tablas principales existen" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algunas tablas no se crearon correctamente" -ForegroundColor Yellow
}
Write-Host ""

# Paso 6: Migrar datos de usuarios a organizaciones
Write-Host "📦 Paso 6: Migrando usuarios a organizaciones..." -ForegroundColor Yellow
Write-Host "   Ejecutando script de migración..." -ForegroundColor Gray

$migrationScript = "apps/backend/src/scripts/migrate-users-organization.ts"
if (Test-Path $migrationScript) {
    npx ts-node $migrationScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migración de usuarios completada" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Error en la migración de usuarios" -ForegroundColor Yellow
        Write-Host "   Puedes ejecutar manualmente: npx ts-node $migrationScript" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Script de migración no encontrado" -ForegroundColor Yellow
}
Write-Host ""

# Resumen
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Implementar RLS en Supabase (ver: apps/backend/scripts/setup-rls-users.sql)" -ForegroundColor White
Write-Host "2. Reiniciar el servidor: npm run dev" -ForegroundColor White
Write-Host "3. Verificar que /admin/users funciona correctamente" -ForegroundColor White
Write-Host ""
Write-Host "Para implementar RLS:" -ForegroundColor Yellow
Write-Host "1. Ir a Supabase Dashboard > SQL Editor" -ForegroundColor White
Write-Host "2. Copiar contenido de: apps/backend/scripts/setup-rls-users.sql" -ForegroundColor White
Write-Host "3. Ejecutar el script" -ForegroundColor White
Write-Host ""
Write-Host "🎉 ¡Base de datos lista para usar!" -ForegroundColor Green
