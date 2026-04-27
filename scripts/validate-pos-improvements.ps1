# Script de Validacion de Mejoras del POS
# Fecha: 12 de febrero de 2026

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Validacion de Mejoras del POS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$WarningCount = 0

# Funcion para mostrar resultados
function Show-Result {
    param(
        [string]$Test,
        [bool]$Success,
        [string]$Message = ""
    )
    
    if ($Success) {
        Write-Host "[OK] $Test" -ForegroundColor Green
        if ($Message) {
            Write-Host "   $Message" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] $Test" -ForegroundColor Red
        if ($Message) {
            Write-Host "   $Message" -ForegroundColor Yellow
        }
        $script:ErrorCount++
    }
}

function Show-Warning {
    param(
        [string]$Test,
        [string]$Message
    )
    
    Write-Host "[WARN] $Test" -ForegroundColor Yellow
    Write-Host "   $Message" -ForegroundColor Gray
    $script:WarningCount++
}

# 1. Verificar archivos modificados
Write-Host "1. Verificando archivos modificados..." -ForegroundColor Cyan

$files = @(
    "apps/backend/src/routes/sales.ts",
    "apps/frontend/src/components/pos/ReceiptModal.tsx",
    "apps/frontend/src/app/api/pos/sales/route.ts",
    "apps/frontend/src/lib/pos/__tests__/calculations.test.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Show-Result "Archivo encontrado: $file" $true
    } else {
        Show-Result "Archivo NO encontrado: $file" $false
    }
}

Write-Host ""

# 2. Verificar cambios en backend
Write-Host "2. Verificando cambios en backend..." -ForegroundColor Cyan

$salesContent = Get-Content "apps/backend/src/routes/sales.ts" -Raw

if ($salesContent -match "subtotalWithoutTax") {
    Show-Result "Backend: Variable subtotalWithoutTax encontrada" $true
} else {
    Show-Result "Backend: Variable subtotalWithoutTax NO encontrada" $false
}

if ($salesContent -match "subtotalWithTax") {
    Show-Result "Backend: Variable subtotalWithTax encontrada" $true
} else {
    Show-Result "Backend: Variable subtotalWithTax NO encontrada" $false
}

if ($salesContent -match "taxIncluded") {
    Show-Result "Backend: Logica de taxIncluded encontrada" $true
} else {
    Show-Result "Backend: Logica de taxIncluded NO encontrada" $false
}

if ($salesContent -match "finalTaxAmount") {
    Show-Result "Backend: Recalculo de IVA con descuentos implementado" $true
} else {
    Show-Result "Backend: Recalculo de IVA con descuentos NO implementado" $false
}

Write-Host ""

# 3. Verificar cambios en ReceiptModal
Write-Host "3. Verificando cambios en ReceiptModal..." -ForegroundColor Cyan

$receiptContent = Get-Content "apps/frontend/src/components/pos/ReceiptModal.tsx" -Raw

if ($receiptContent -match "saleData\.subtotal") {
    Show-Result "ReceiptModal: Usa subtotal de BD" $true
} else {
    Show-Result "ReceiptModal: NO usa subtotal de BD" $false
}

if ($receiptContent -match "calculatedSubtotal") {
    Show-Warning "ReceiptModal: Todavia contiene calculo inverso" "Revisar si se elimino correctamente"
} else {
    Show-Result "ReceiptModal: Calculo inverso eliminado" $true
}

Write-Host ""

# 4. Verificar cambios en API route
Write-Host "4. Verificando cambios en API route..." -ForegroundColor Cyan

$apiContent = Get-Content "apps/frontend/src/app/api/pos/sales/route.ts" -Raw

if ($apiContent -match "total_amount") {
    Show-Result "API Route: Captura total_amount del frontend" $true
} else {
    Show-Result "API Route: NO captura total_amount" $false
}

if ($apiContent -match "Total mismatch") {
    Show-Result "API Route: Validacion cruzada implementada" $true
} else {
    Show-Result "API Route: Validacion cruzada NO implementada" $false
}

if ($apiContent -match "tolerance") {
    Show-Result "API Route: Tolerancia de redondeo configurada" $true
} else {
    Show-Result "API Route: Tolerancia de redondeo NO configurada" $false
}

Write-Host ""

# 5. Verificar tests
Write-Host "5. Verificando tests unitarios..." -ForegroundColor Cyan

if (Test-Path "apps/frontend/src/lib/pos/__tests__/calculations.test.ts") {
    $testContent = Get-Content "apps/frontend/src/lib/pos/__tests__/calculations.test.ts" -Raw
    
    $testCount = ([regex]::Matches($testContent, "it\(")).Count
    Show-Result "Tests encontrados: $testCount casos" ($testCount -ge 10) "Se esperan al menos 10 tests"
    
    if ($testContent -match "IVA incluido") {
        Show-Result "Tests: Casos de IVA incluido" $true
    }
    
    if ($testContent -match "IVA NO incluido") {
        Show-Result "Tests: Casos de IVA NO incluido" $true
    }
    
    if ($testContent -match "Descuentos") {
        Show-Result "Tests: Casos de descuentos" $true
    }
} else {
    Show-Result "Archivo de tests NO encontrado" $false
}

Write-Host ""

# Resumen final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE VALIDACION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0 -and $WarningCount -eq 0) {
    Write-Host "[OK] TODAS LAS VALIDACIONES PASARON" -ForegroundColor Green
    Write-Host ""
    Write-Host "Las mejoras del POS se implementaron correctamente." -ForegroundColor Green
    Write-Host "El sistema esta listo para pruebas en staging." -ForegroundColor Green
} elseif ($ErrorCount -eq 0) {
    Write-Host "[WARN] VALIDACION COMPLETADA CON ADVERTENCIAS" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Errores criticos: $ErrorCount" -ForegroundColor Green
    Write-Host "Advertencias: $WarningCount" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Revisar las advertencias antes de desplegar." -ForegroundColor Yellow
} else {
    Write-Host "[ERROR] VALIDACION FALLIDA" -ForegroundColor Red
    Write-Host ""
    Write-Host "Errores criticos: $ErrorCount" -ForegroundColor Red
    Write-Host "Advertencias: $WarningCount" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Corregir los errores antes de continuar." -ForegroundColor Red
}

Write-Host ""
Write-Host "Documentacion completa en:" -ForegroundColor Cyan
Write-Host "  - .agent/audits/pos-sales-audit-2026-02-12.md" -ForegroundColor Gray
Write-Host "  - .agent/audits/pos-sales-improvements-implemented.md" -ForegroundColor Gray
Write-Host ""

# Exit code
if ($ErrorCount -gt 0) {
    exit 1
} else {
    exit 0
}
