# ✅ Checklist de Verificación: Sistema de Dominios SaaS

## Pre-Deployment

### Base de Datos
- [ ] Ejecutar migración: `npm run ts-node scripts/apply-system-settings-migration.ts`
- [ ] Verificar tabla existe: `SELECT * FROM system_settings;`
- [ ] Verificar RLS policies: Solo Super Admins pueden acceder
- [ ] Configurar dominio base: `npm run ts-node scripts/configure-base-domain.ts`

### Variables de Entorno
- [ ] Agregar a `.env.local`: `NEXT_PUBLIC_BASE_DOMAIN=miposparaguay.vercel.app`
- [ ] Verificar Supabase credentials están configuradas
- [ ] Reiniciar servidor de desarrollo

### Código
- [ ] No hay errores de TypeScript
- [ ] No hay errores de ESLint
- [ ] Build exitoso: `npm run build`

## Post-Deployment

### SuperAdmin
- [ ] Acceder a `/superadmin`
- [ ] Ver tab "Configuración"
- [ ] Verificar dominio carga: `miposparaguay.vercel.app`
- [ ] Modificar y guardar dominio
- [ ] Verificar que persiste después de refresh

### Admin
- [ ] Acceder a `/admin/business-config`
- [ ] Ver tab "Dominio y Tienda"
- [ ] Verificar campos cargan correctamente
- [ ] Configurar subdomain de prueba: `test-tienda`
- [ ] Verificar vista previa: `test-tienda.miposparaguay.vercel.app`
- [ ] Guardar configuración
- [ ] Verificar que persiste

### Páginas Públicas
- [ ] Acceder a `[subdomain].miposparaguay.vercel.app/home`
- [ ] Verificar que carga datos de la organización correcta
- [ ] Verificar que no se mezclan datos entre organizaciones
- [ ] Probar `/offers`, `/catalog`, `/orders/track`

### Seguridad
- [ ] Usuario no Super Admin no puede acceder a `/api/superadmin/system-settings`
- [ ] Usuario no Admin no puede modificar subdomain de organización
- [ ] Cookies httpOnly están configuradas
- [ ] Organization_id se inyecta correctamente

### DNS (Producción)
- [ ] Dominio configurado en Vercel
- [ ] Subdominios wildcard funcionan
- [ ] SSL activo en todos los subdominios
- [ ] Redirecciones funcionan correctamente

## Testing

### Funcional
- [ ] Super Admin puede configurar dominio base
- [ ] Admin puede configurar subdomain
- [ ] Vista previa muestra URL correcta
- [ ] Botón copiar funciona
- [ ] Botón abrir tienda funciona
- [ ] Validaciones de formato funcionan

### Integración
- [ ] Middleware detecta organización por subdomain
- [ ] Cookies se inyectan correctamente
- [ ] Páginas públicas filtran por organization_id
- [ ] API endpoints respetan multitenancy

### Performance
- [ ] Carga de configuración es rápida
- [ ] No hay queries N+1
- [ ] Caché funciona correctamente

## Documentación

- [ ] README actualizado
- [ ] Guías de configuración completas
- [ ] Troubleshooting documentado
- [ ] Ejemplos de uso claros

## Rollback Plan

Si algo falla:
1. Revertir commit
2. Eliminar tabla `system_settings` si es necesario
3. Remover variable de entorno
4. Reiniciar servidor

---

**Fecha de verificación:** _____________  
**Verificado por:** _____________  
**Estado:** [ ] Aprobado [ ] Requiere cambios
