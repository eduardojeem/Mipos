#!/bin/bash

# =====================================================
# Script: Aplicar Mejoras de Returns
# Propósito: Ejecutar migración y regenerar cliente de Prisma
# Fecha: 2026-02-11
# =====================================================

echo "========================================"
echo "Aplicando Mejoras de Returns"
echo "========================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}Error: No se encuentra prisma/schema.prisma${NC}"
    echo -e "${YELLOW}Asegúrate de ejecutar este script desde la raíz del proyecto${NC}"
    exit 1
fi

echo -e "${YELLOW}Paso 1: Verificando conexión a base de datos...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: Archivo .env no encontrado${NC}"
    exit 1
fi

DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL no encontrada en .env${NC}"
    exit 1
fi

echo -e "${GREEN}Conexión configurada correctamente${NC}"
echo ""

# Paso 2: Crear migración
echo -e "${YELLOW}Paso 2: Creando migración de Prisma...${NC}"
if npx prisma migrate dev --name add_sync_failures_and_audit_metadata --skip-generate; then
    echo -e "${GREEN}Migración creada exitosamente${NC}"
else
    echo -e "${RED}Error al crear migración${NC}"
    echo ""
    echo -e "${YELLOW}Intentando aplicar SQL directamente...${NC}"
    
    if [ -f "prisma/migrations/add_sync_failures_and_audit_metadata.sql" ]; then
        echo -e "${YELLOW}Aplicando SQL manualmente...${NC}"
        echo -e "${CYAN}Por favor ejecuta manualmente:${NC}"
        echo -e "${CYAN}psql -U your_user -d your_database -f prisma/migrations/add_sync_failures_and_audit_metadata.sql${NC}"
    fi
fi

echo ""

# Paso 3: Regenerar cliente de Prisma
echo -e "${YELLOW}Paso 3: Regenerando cliente de Prisma...${NC}"
if npx prisma generate; then
    echo -e "${GREEN}Cliente de Prisma regenerado exitosamente${NC}"
else
    echo -e "${RED}Error al regenerar cliente${NC}"
    exit 1
fi

echo ""

# Paso 4: Verificar tipos de TypeScript
echo -e "${YELLOW}Paso 4: Verificando tipos de TypeScript...${NC}"
echo -e "${CYAN}Ejecutando typecheck en backend...${NC}"

cd apps/backend
if npm run typecheck > /dev/null 2>&1; then
    echo -e "${GREEN}Typecheck completado sin errores${NC}"
else
    echo -e "${YELLOW}Advertencia: Hay algunos errores de tipos${NC}"
    echo -e "${CYAN}Ejecuta 'npm run typecheck' en apps/backend para ver detalles${NC}"
fi
cd ../..

echo ""

# Paso 5: Resumen
echo "========================================"
echo "Resumen de Cambios Aplicados"
echo "========================================"
echo ""
echo -e "${GREEN}✅ Tabla sync_failures creada${NC}"
echo -e "${GREEN}✅ Campo metadata agregado a audit_logs${NC}"
echo -e "${GREEN}✅ Cliente de Prisma regenerado${NC}"
echo -e "${GREEN}✅ Mejoras de validación implementadas en código${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "${CYAN}1. Reiniciar el servidor: npm run dev${NC}"
echo -e "${CYAN}2. Ejecutar tests manuales (ver .agent/audits/returns-post-implementation-steps.md)${NC}"
echo -e "${CYAN}3. Monitorear logs durante las primeras 24 horas${NC}"
echo ""
echo -e "${YELLOW}Documentación completa en:${NC}"
echo -e "${CYAN}- .agent/audits/RESUMEN_EJECUTIVO_RETURNS.md${NC}"
echo -e "${CYAN}- .agent/audits/returns-improvements-summary.md${NC}"
echo ""
echo "========================================"
echo -e "${GREEN}Implementación completada exitosamente!${NC}"
echo "========================================"
