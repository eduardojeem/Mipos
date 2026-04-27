# Script para verificar que los servicios esten corriendo
# Fecha: 12 de febrero de 2026

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Verificacion de Servicios" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# 1. Verificar Backend
Write-Host "1. Verificando Backend..." -ForegroundColor Cyan

try {
    $backendHealth = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($backendHealth.StatusCode -eq 200) {
        Write-Host "[OK] Backend esta corriendo en puerto 3001" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Backend respondio con codigo $($backendHealth.StatusCode)" -ForegroundColor Red
        $allOk = $false
    }
} catch {
    Write-Host "[ERROR] Backend NO esta corriendo en puerto 3001" -ForegroundColor Red
    Write-Host "   Iniciar con: cd apps/backend && npm run dev" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# 2. Verificar Frontend
Write-Host "2. Verificando Frontend..." -ForegroundColor Cyan

try {
    $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction Stop
    if ($frontendHealth.StatusCode -eq 200) {
        Write-Host "[OK] Frontend esta corriendo en puerto 3000" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Frontend respondio con codigo $($frontendHealth.StatusCode)" -ForegroundColor Red
        $allOk = $false
    }
} catch {
    Write-Host "[ERROR] Frontend NO esta corriendo en puerto 3000" -ForegroundColor Red
    Write-Host "   Iniciar con: cd apps/frontend && npm run dev" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# 3. Verificar Variables de Entorno
Write-Host "3. Verificando Variables de Entorno..." -ForegroundColor Cyan

if (Test-Path ".env") {
    Write-Host "[OK] Archivo .env encontrado" -ForegroundColor Green
    
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "BACKEND_URL") {
        Write-Host "[OK] BACKEND_URL configurado" -ForegroundColor Green
    } else {
        Write-Host "[WARN] BACKEND_URL no encontrado en .env" -ForegroundColor Yellow
    }
    
    if ($envContent -match "DATABASE_URL") {
        Write-Host "[OK] DATABASE_URL configurado" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] DATABASE_URL no encontrado en .env" -ForegroundColor Red
        $allOk = $false
    }
} else {
    Write-Host "[WARN] Archivo .env no encontrado" -ForegroundColor Yellow
    Write-Host "   Crear desde .env.example" -ForegroundColor Gray
}

Write-Host ""

# 4. Verificar Prisma
Write-Host "4. Verificando Prisma..." -ForegroundColor Cyan

if (Test-Path "apps/backend/node_modules/.prisma/client") {
    Write-Host "[OK] Prisma client generado" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Prisma client NO generado" -ForegroundColor Red
    Write-Host "   Generar con: cd apps/backend && npx prisma generate" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# 5. Verificar node_modules
Write-Host "5. Verificando dependencias..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "[OK] Dependencias raiz instaladas" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Dependencias raiz NO instaladas" -ForegroundColor Red
    Write-Host "   Instalar con: npm install" -ForegroundColor Yellow
    $allOk = $false
}

if (Test-Path "apps/backend/node_modules") {
    Write-Host "[OK] Dependencias backend instaladas" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Dependencias backend NO instaladas" -ForegroundColor Red
    Write-Host "   Instalar con: cd apps/backend && npm install" -ForegroundColor Yellow
    $allOk = $false
}

if (Test-Path "apps/frontend/node_modules") {
    Write-Host "[OK] Dependencias frontend instaladas" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Dependencias frontend NO instaladas" -ForegroundColor Red
    Write-Host "   Instalar con: cd apps/frontend && npm install" -ForegroundColor Yellow
    $allOk = $false
}

Write-Host ""

# Resumen
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($allOk) {
    Write-Host "[OK] Todos los servicios estan corriendo correctamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puedes acceder a:" -ForegroundColor Cyan
    Write-Host "  - Frontend: http://localhost:3000" -ForegroundColor Gray
    Write-Host "  - Backend:  http://localhost:3001" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Algunos servicios no estan corriendo" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pasos para iniciar:" -ForegroundColor Cyan
    Write-Host "  1. Terminal 1: cd apps/backend && npm run dev" -ForegroundColor Gray
    Write-Host "  2. Terminal 2: cd apps/frontend && npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Si hay errores, revisar:" -ForegroundColor Cyan
    Write-Host "  - .agent/audits/TROUBLESHOOTING_JSON_ERROR.md" -ForegroundColor Gray
}

Write-Host ""

if ($allOk) {
    exit 0
} else {
    exit 1
}
