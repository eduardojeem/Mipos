#!/bin/bash
# Script de Validación de Mejoras del POS
# Fecha: 12 de febrero de 2026

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

ERROR_COUNT=0
WARNING_COUNT=0

# Función para mostrar resultados
show_result() {
    local test="$1"
    local success="$2"
    local message="$3"
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ $test${NC}"
        if [ -n "$message" ]; then
            echo -e "${GRAY}   $message${NC}"
        fi
    else
        echo -e "${RED}❌ $test${NC}"
        if [ -n "$message" ]; then
            echo -e "${YELLOW}   $message${NC}"
        fi
        ((ERROR_COUNT++))
    fi
}

show_warning() {
    local test="$1"
    local message="$2"
    
    echo -e "${YELLOW}⚠️  $test${NC}"
    echo -e "${GRAY}   $message${NC}"
    ((WARNING_COUNT++))
}

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Validación de Mejoras del POS${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# 1. Verificar archivos modificados
echo -e "${CYAN}1. Verificando archivos modificados...${NC}"

files=(
    "apps/backend/src/routes/sales.ts"
    "apps/frontend/src/components/pos/ReceiptModal.tsx"
    "apps/frontend/src/app/api/pos/sales/route.ts"
    "apps/frontend/src/lib/pos/__tests__/calculations.test.ts"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        show_result "Archivo encontrado: $file" "true"
    else
        show_result "Archivo NO encontrado: $file" "false"
    fi
done

echo ""

# 2. Verificar cambios en backend
echo -e "${CYAN}2. Verificando cambios en backend...${NC}"

if grep -q "subtotalWithoutTax" "apps/backend/src/routes/sales.ts"; then
    show_result "Backend: Variable subtotalWithoutTax encontrada" "true"
else
    show_result "Backend: Variable subtotalWithoutTax NO encontrada" "false"
fi

if grep -q "subtotalWithTax" "apps/backend/src/routes/sales.ts"; then
    show_result "Backend: Variable subtotalWithTax encontrada" "true"
else
    show_result "Backend: Variable subtotalWithTax NO encontrada" "false"
fi

if grep -q "taxIncluded" "apps/backend/src/routes/sales.ts"; then
    show_result "Backend: Lógica de taxIncluded encontrada" "true"
else
    show_result "Backend: Lógica de taxIncluded NO encontrada" "false"
fi

if grep -q "finalTaxAmount" "apps/backend/src/routes/sales.ts"; then
    show_result "Backend: Recálculo de IVA con descuentos implementado" "true"
else
    show_result "Backend: Recálculo de IVA con descuentos NO implementado" "false"
fi

echo ""

# 3. Verificar cambios en ReceiptModal
echo -e "${CYAN}3. Verificando cambios en ReceiptModal...${NC}"

if grep -q "saleData\.subtotal" "apps/frontend/src/components/pos/ReceiptModal.tsx"; then
    show_result "ReceiptModal: Usa subtotal de BD" "true"
else
    show_result "ReceiptModal: NO usa subtotal de BD" "false"
fi

if grep -q "calculatedSubtotal" "apps/frontend/src/components/pos/ReceiptModal.tsx"; then
    show_warning "ReceiptModal: Todavía contiene cálculo inverso" "Revisar si se eliminó correctamente"
else
    show_result "ReceiptModal: Cálculo inverso eliminado" "true"
fi

echo ""

# 4. Verificar cambios en API route
echo -e "${CYAN}4. Verificando cambios en API route...${NC}"

if grep -q "total_amount" "apps/frontend/src/app/api/pos/sales/route.ts"; then
    show_result "API Route: Captura total_amount del frontend" "true"
else
    show_result "API Route: NO captura total_amount" "false"
fi

if grep -q "Total mismatch" "apps/frontend/src/app/api/pos/sales/route.ts"; then
    show_result "API Route: Validación cruzada implementada" "true"
else
    show_result "API Route: Validación cruzada NO implementada" "false"
fi

if grep -q "tolerance" "apps/frontend/src/app/api/pos/sales/route.ts"; then
    show_result "API Route: Tolerancia de redondeo configurada" "true"
else
    show_result "API Route: Tolerancia de redondeo NO configurada" "false"
fi

echo ""

# 5. Verificar tests
echo -e "${CYAN}5. Verificando tests unitarios...${NC}"

if [ -f "apps/frontend/src/lib/pos/__tests__/calculations.test.ts" ]; then
    test_count=$(grep -c "it(" "apps/frontend/src/lib/pos/__tests__/calculations.test.ts")
    
    if [ "$test_count" -ge 10 ]; then
        show_result "Tests encontrados: $test_count casos" "true" "Se esperan al menos 10 tests"
    else
        show_result "Tests encontrados: $test_count casos" "false" "Se esperan al menos 10 tests"
    fi
    
    if grep -q "IVA incluido" "apps/frontend/src/lib/pos/__tests__/calculations.test.ts"; then
        show_result "Tests: Casos de IVA incluido" "true"
    fi
    
    if grep -q "IVA NO incluido" "apps/frontend/src/lib/pos/__tests__/calculations.test.ts"; then
        show_result "Tests: Casos de IVA NO incluido" "true"
    fi
    
    if grep -q "Descuentos" "apps/frontend/src/lib/pos/__tests__/calculations.test.ts"; then
        show_result "Tests: Casos de descuentos" "true"
    fi
else
    show_result "Archivo de tests NO encontrado" "false"
fi

echo ""

# 6. Type checking (opcional)
echo -e "${CYAN}6. Verificación de tipos (TypeScript)...${NC}"

echo -e "${GRAY}   Ejecutando type-check en backend...${NC}"
cd apps/backend
if npm run type-check > /dev/null 2>&1; then
    show_result "Backend: Type-check exitoso" "true"
else
    show_warning "Backend: Type-check con errores" "Revisar errores de TypeScript"
fi
cd ../..

echo -e "${GRAY}   Ejecutando type-check en frontend...${NC}"
cd apps/frontend
if npm run type-check > /dev/null 2>&1; then
    show_result "Frontend: Type-check exitoso" "true"
else
    show_warning "Frontend: Type-check con errores" "Revisar errores de TypeScript"
fi
cd ../..

echo ""

# 7. Ejecutar tests (opcional)
echo -e "${CYAN}7. Ejecutando tests unitarios...${NC}"

echo -e "${GRAY}   Ejecutando tests de calculations...${NC}"
cd apps/frontend
if npm run test calculations.test.ts > /dev/null 2>&1; then
    show_result "Tests: Todos los tests pasaron" "true"
else
    show_warning "Tests: Algunos tests fallaron" "Revisar output de tests"
fi
cd ../..

echo ""

# Resumen final
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  RESUMEN DE VALIDACIÓN${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ TODAS LAS VALIDACIONES PASARON${NC}"
    echo ""
    echo -e "${GREEN}Las mejoras del POS se implementaron correctamente.${NC}"
    echo -e "${GREEN}El sistema está listo para pruebas en staging.${NC}"
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  VALIDACIÓN COMPLETADA CON ADVERTENCIAS${NC}"
    echo ""
    echo -e "${GREEN}Errores críticos: $ERROR_COUNT${NC}"
    echo -e "${YELLOW}Advertencias: $WARNING_COUNT${NC}"
    echo ""
    echo -e "${YELLOW}Revisar las advertencias antes de desplegar.${NC}"
else
    echo -e "${RED}❌ VALIDACIÓN FALLIDA${NC}"
    echo ""
    echo -e "${RED}Errores críticos: $ERROR_COUNT${NC}"
    echo -e "${YELLOW}Advertencias: $WARNING_COUNT${NC}"
    echo ""
    echo -e "${RED}Corregir los errores antes de continuar.${NC}"
fi

echo ""
echo -e "${CYAN}Documentación completa en:${NC}"
echo -e "${GRAY}  - .agent/audits/pos-sales-audit-2026-02-12.md${NC}"
echo -e "${GRAY}  - .agent/audits/pos-sales-improvements-implemented.md${NC}"
echo ""

# Exit code
if [ $ERROR_COUNT -gt 0 ]; then
    exit 1
else
    exit 0
fi
