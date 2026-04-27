# =====================================================
# Script de Diagnóstico: Datos de Usuarios
# Verifica por qué /admin/users no muestra datos reales
# Incluye verificación de auth.users vs public.users
# =====================================================

Write-Host "🔍 DIAGNÓSTICO: Datos de Usuarios (auth.users vs public.users)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  IMPORTANTE: Supabase tiene DOS tablas de usuarios:" -ForegroundColor Yellow
Write-Host "   • auth.users    - Autenticación (gestionada por Supabase)" -ForegroundColor White
Write-Host "   • public.users  - Perfil del sistema (gestionada por nuestra app)" -ForegroundColor White
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
    Write-Host "   Verifica DATABASE_URL en .env" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Conexión exitosa" -ForegroundColor Green
Write-Host ""

# Paso 2: Verificar que la tabla users existe
Write-Host "🗄️  Paso 2: Verificando tabla users..." -ForegroundColor Yellow

$checkTableSQL = @"
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
) as table_exists;
"@

Write-Host "   Ejecutando query..." -ForegroundColor Gray
# Nota: Este comando requiere que psql esté instalado
# Alternativa: Ejecutar manualmente en Supabase SQL Editor

Write-Host "⚠️  Ejecuta manualmente en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host $checkTableSQL -ForegroundColor Gray
Write-Host ""

# Paso 3: Contar usuarios
Write-Host "📊 Paso 3: Verificando cantidad de usuarios..." -ForegroundColor Yellow

$countUsersSQL = @"
SELECT COUNT(*) as total_users FROM public.users;
"@

Write-Host "   Ejecuta en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host $countUsersSQL -ForegroundColor Gray
Write-Host ""

# Paso 4: Ver usuarios existentes
Write-Host "👥 Paso 4: Ver usuarios existentes..." -ForegroundColor Yellow

$listUsersSQL = @"
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  status, 
  organization_id,
  created_at 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 5;
"@

Write-Host "   Ejecuta en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host $listUsersSQL -ForegroundColor Gray
Write-Host ""

# Paso 5: Verificar organizaciones
Write-Host "🏢 Paso 5: Verificando organizaciones..." -ForegroundColor Yellow

$checkOrgsSQL = @"
SELECT 
  id,
  name,
  slug,
  status,
  (SELECT COUNT(*) FROM public.users WHERE organization_id = organizations.id) as user_count
FROM public.organizations
ORDER BY created_at DESC;
"@

Write-Host "   Ejecuta en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host $checkOrgsSQL -ForegroundColor Gray
Write-Host ""

# Paso 6: Verificar usuarios sin organización
Write-Host "⚠️  Paso 6: Verificando usuarios sin organización..." -ForegroundColor Yellow

$usersWithoutOrgSQL = @"
SELECT 
  COUNT(*) as users_without_org
FROM public.users
WHERE organization_id IS NULL;
"@

Write-Host "   Ejecuta en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host $usersWithoutOrgSQL -ForegroundColor Gray
Write-Host ""

# Paso 7: Probar la API del backend
Write-Host "🌐 Paso 7: Probando API del backend..." -ForegroundColor Yellow
Write-Host "   Asegúrate de que el servidor esté corriendo (npm run dev)" -ForegroundColor Gray
Write-Host ""
Write-Host "   Ejecuta en otra terminal:" -ForegroundColor Yellow
Write-Host "   curl http://localhost:3001/api/users?page=1&limit=5" -ForegroundColor Gray
Write-Host ""

# Resumen de acciones
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📋 RESUMEN DE DIAGNÓSTICO" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ejecuta estos pasos en Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Verificar tabla users existe:" -ForegroundColor White
Write-Host $checkTableSQL -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Contar usuarios:" -ForegroundColor White
Write-Host $countUsersSQL -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Ver usuarios:" -ForegroundColor White
Write-Host $listUsersSQL -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Ver organizaciones:" -ForegroundColor White
Write-Host $checkOrgsSQL -ForegroundColor Gray
Write-Host ""

Write-Host "5️⃣  Usuarios sin organización:" -ForegroundColor White
Write-Host $usersWithoutOrgSQL -ForegroundColor Gray
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🎯 POSIBLES PROBLEMAS Y SOLUCIONES" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Si hay usuarios en auth.users pero NO en public.users:" -ForegroundColor Yellow
Write-Host "  → Ejecutar: npx ts-node apps/backend/src/scripts/sync-auth-public-users.ts" -ForegroundColor White
Write-Host "  → O ejecutar trigger SQL: apps/backend/scripts/setup-auth-sync-trigger.sql" -ForegroundColor White
Write-Host ""

Write-Host "Si COUNT(*) = 0 en ambas tablas (no hay usuarios):" -ForegroundColor Yellow
Write-Host "  → Crear usuarios en Supabase Dashboard > Authentication > Users" -ForegroundColor White
Write-Host "  → El trigger los sincronizará automáticamente a public.users" -ForegroundColor White
Write-Host ""

Write-Host "Si hay usuarios pero organization_id es NULL:" -ForegroundColor Yellow
Write-Host "  → Ejecutar: npx ts-node apps/backend/src/scripts/migrate-users-organization.ts" -ForegroundColor White
Write-Host ""

Write-Host "Si la API no responde:" -ForegroundColor Yellow
Write-Host "  → Verificar que el servidor esté corriendo: npm run dev" -ForegroundColor White
Write-Host "  → Verificar logs del servidor" -ForegroundColor White
Write-Host ""

Write-Host "Si la API responde pero el frontend no muestra datos:" -ForegroundColor Yellow
Write-Host "  → Abrir DevTools (F12) > Console" -ForegroundColor White
Write-Host "  → Buscar errores en la consola" -ForegroundColor White
Write-Host "  → Verificar Network tab para ver la petición a /api/users" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📞 DOCUMENTACIÓN COMPLETA" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ver: .agent/audits/AUDITORIA_AUTH_VS_PUBLIC_USERS.md" -ForegroundColor White
Write-Host "Ver: .agent/audits/AUDITORIA_DATOS_REALES_USERS.md" -ForegroundColor White
Write-Host ""
