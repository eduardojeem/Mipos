# ✅ Checklist de Despliegue: Corrección de Seguridad

**Endpoint:** `/api/system/settings`  
**Fecha:** 5 de febrero de 2026  
**Responsable:** [Nombre]

---

## 📋 Pre-Despliegue

### Verificación de Código

- [ ] **Código revisado y aprobado**
  - [ ] Control de acceso implementado (`assertAdmin`)
  - [ ] Multitenancy implementado (`organization_id`)
  - [ ] Validación de datos implementada
  - [ ] Auditoría de cambios implementada
  - [ ] Manejo de errores robusto
  - [ ] Comentarios y documentación en código

- [ ] **Tests locales ejecutados**
  ```bash
  npx tsx scripts/test-system-settings-security.ts
  ```
  - [ ] Test 1: Acceso sin autenticación (401) ✅
  - [ ] Test 7: Migración de BD verificada ✅

- [ ] **Archivos creados/modificados**
  - [ ] `apps/frontend/src/app/api/system/settings/route.ts` (modificado)
  - [ ] `supabase/migrations/20260205_add_multitenancy_business_config.sql` (nuevo)
  - [ ] `scripts/test-system-settings-security.ts` (nuevo)
  - [ ] Documentación completa (4 archivos MD)

### Preparación de Base de Datos

- [ ] **Backup de base de datos creado**
  ```bash
  # Comando de backup
  pg_dump -h <host> -U <user> -d <database> > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
  - [ ] Backup almacenado en ubicación segura
  - [ ] Backup verificado (puede restaurarse)

- [ ] **Migración revisada**
  - [ ] SQL sintácticamente correcto
  - [ ] Políticas RLS correctas
  - [ ] Índices optimizados
  - [ ] Migración de datos existentes contemplada

### Comunicación

- [ ] **Equipo notificado**
  - [ ] Desarrolladores informados
  - [ ] DevOps informado
  - [ ] Administradores de sistema informados
  - [ ] Usuarios finales notificados (si aplica)

- [ ] **Ventana de mantenimiento programada** (si aplica)
  - Fecha: _______________
  - Hora inicio: _______________
  - Hora fin: _______________
  - Duración estimada: 30 minutos

---

## 🚀 Despliegue a Staging

### Aplicar Migración

- [ ] **Conectar a base de datos de staging**
  ```bash
  psql -h <staging-host> -U <user> -d <database>
  ```

- [ ] **Ejecutar migración**
  ```bash
  # Opción 1: Supabase CLI
  supabase db push --db-url <staging-url>
  
  # Opción 2: SQL directo
  psql -h <host> -U <user> -d <database> \
    -f supabase/migrations/20260205_add_multitenancy_business_config.sql
  ```

- [ ] **Verificar migración exitosa**
  ```sql
  -- Verificar columna organization_id
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'business_config' 
  AND column_name = 'organization_id';
  
  -- Resultado esperado: 1 fila con data_type = 'uuid'
  ```

- [ ] **Verificar políticas RLS**
  ```sql
  SELECT policyname, cmd 
  FROM pg_policies 
  WHERE tablename = 'business_config';
  
  -- Resultado esperado: 8 políticas (2 por operación: admin y super_admin)
  ```

- [ ] **Verificar índices**
  ```sql
  SELECT indexname 
  FROM pg_indexes 
  WHERE tablename = 'business_config';
  
  -- Resultado esperado: Incluye idx_business_config_organization_id
  ```

### Desplegar Código

- [ ] **Commit y push a staging**
  ```bash
  git add .
  git commit -m "fix(security): Agregar control de acceso a /api/system/settings"
  git push origin staging
  ```

- [ ] **Verificar despliegue exitoso**
  - [ ] Build completado sin errores
  - [ ] Aplicación iniciada correctamente
  - [ ] Logs sin errores críticos

### Pruebas en Staging

- [ ] **Pruebas funcionales**
  - [ ] GET sin autenticación → 401 ✅
  - [ ] GET con usuario normal → 403 ✅
  - [ ] GET con ADMIN → 200 ✅
  - [ ] PUT con usuario normal → 403 ✅
  - [ ] PUT con ADMIN → 200 ✅

- [ ] **Pruebas de validación**
  - [ ] Tax rate inválido (150) → 400 ✅
  - [ ] Moneda inválida (XXX) → 400 ✅
  - [ ] Time format inválido (25h) → 400 ✅

- [ ] **Pruebas de multitenancy**
  - [ ] ADMIN Org A no ve config de Org B ✅
  - [ ] ADMIN Org A no puede modificar config de Org B ✅
  - [ ] SUPER_ADMIN ve todas las configs ✅

- [ ] **Pruebas de auditoría**
  ```sql
  SELECT * FROM audit_logs 
  WHERE action LIKE 'system.settings%' 
  ORDER BY timestamp DESC 
  LIMIT 5;
  
  -- Verificar que se registran los cambios
  ```

- [ ] **Pruebas de performance**
  - [ ] Tiempo de respuesta GET < 300ms ✅
  - [ ] Tiempo de respuesta PUT < 500ms ✅

---

## 🎯 Despliegue a Producción

### Pre-Producción

- [ ] **Todas las pruebas de staging pasaron**
- [ ] **Aprobación de stakeholders obtenida**
- [ ] **Backup de producción creado**
  - Fecha: _______________
  - Ubicación: _______________
  - Tamaño: _______________

- [ ] **Plan de rollback preparado**
  ```sql
  -- Script de rollback disponible en:
  -- [ubicación del script]
  ```

### Aplicar Migración en Producción

- [ ] **Conectar a base de datos de producción**
  ```bash
  psql -h <prod-host> -U <user> -d <database>
  ```

- [ ] **Ejecutar migración**
  ```bash
  supabase db push --db-url <production-url>
  ```
  - Hora inicio: _______________
  - Hora fin: _______________
  - Duración: _______________

- [ ] **Verificar migración exitosa**
  - [ ] Columna organization_id existe
  - [ ] Políticas RLS creadas
  - [ ] Índices creados
  - [ ] Datos migrados correctamente

### Desplegar Código en Producción

- [ ] **Merge a main**
  ```bash
  git checkout main
  git merge staging
  git push origin main
  ```

- [ ] **Verificar despliegue**
  - [ ] Build exitoso
  - [ ] Aplicación iniciada
  - [ ] Health check OK

### Verificación Post-Despliegue

- [ ] **Pruebas de humo (5 min)**
  - [ ] Endpoint responde correctamente
  - [ ] Autenticación funciona
  - [ ] Autorización funciona
  - [ ] Validación funciona

- [ ] **Monitoreo activo (30 min)**
  - [ ] Logs sin errores críticos
  - [ ] Performance normal
  - [ ] Tasa de error < 1%
  - [ ] Tiempo de respuesta normal

- [ ] **Verificar auditoría**
  ```sql
  SELECT COUNT(*) FROM audit_logs 
  WHERE action LIKE 'system.settings%' 
  AND timestamp > NOW() - INTERVAL '1 hour';
  
  -- Verificar que se están registrando eventos
  ```

---

## 📊 Verificación de Métricas

### Métricas de Seguridad

- [ ] **Intentos de acceso no autorizado**
  - Antes: No medido
  - Después: _____ intentos bloqueados
  - Estado: ✅ Bloqueados correctamente

- [ ] **Logs de auditoría**
  - Antes: 0 registros
  - Después: _____ registros
  - Estado: ✅ Funcionando

### Métricas de Performance

- [ ] **Tiempo de respuesta GET**
  - Antes: ~200ms
  - Después: _____ ms
  - Estado: _____ (✅ <300ms / ⚠️ >300ms)

- [ ] **Tiempo de respuesta PUT**
  - Antes: ~250ms
  - Después: _____ ms
  - Estado: _____ (✅ <500ms / ⚠️ >500ms)

### Métricas de Funcionalidad

- [ ] **Tasa de éxito de requests**
  - Objetivo: >99%
  - Actual: _____ %
  - Estado: _____ (✅ >99% / ⚠️ <99%)

- [ ] **Usuarios afectados**
  - Reportes de problemas: _____
  - Estado: _____ (✅ 0 / ⚠️ >0)

---

## 🚨 Plan de Rollback

### Condiciones para Rollback

Ejecutar rollback si:
- [ ] Tasa de error > 5%
- [ ] Tiempo de respuesta > 1000ms
- [ ] Usuarios no pueden acceder a configuración
- [ ] Datos corruptos o perdidos
- [ ] Errores críticos en logs

### Procedimiento de Rollback

1. **Revertir código**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Revertir migración**
   ```sql
   -- Eliminar columna organization_id
   ALTER TABLE public.business_config 
   DROP COLUMN IF EXISTS organization_id;
   
   -- Restaurar políticas antiguas
   -- (ejecutar script de rollback)
   ```

3. **Restaurar backup** (si es necesario)
   ```bash
   psql -h <host> -U <user> -d <database> < backup_YYYYMMDD_HHMMSS.sql
   ```

4. **Verificar sistema restaurado**
   - [ ] Endpoint funciona
   - [ ] Usuarios pueden acceder
   - [ ] Datos intactos

---

## 📝 Post-Despliegue

### Documentación

- [ ] **Actualizar documentación técnica**
  - [ ] README actualizado
  - [ ] API docs actualizados
  - [ ] Changelog actualizado

- [ ] **Documentar incidentes** (si aplica)
  - Descripción: _______________
  - Resolución: _______________
  - Lecciones aprendidas: _______________

### Comunicación

- [ ] **Notificar éxito del despliegue**
  - [ ] Equipo de desarrollo
  - [ ] DevOps
  - [ ] Stakeholders
  - [ ] Usuarios (si aplica)

### Seguimiento

- [ ] **Monitoreo continuo (24h)**
  - [ ] Logs revisados cada 4 horas
  - [ ] Métricas monitoreadas
  - [ ] Alertas configuradas

- [ ] **Revisión post-mortem** (1 semana)
  - Fecha programada: _______________
  - Participantes: _______________
  - Agenda: _______________

---

## ✅ Firma de Aprobación

### Pre-Despliegue
- **Desarrollador:** _______________ Fecha: _______________
- **Revisor de Código:** _______________ Fecha: _______________
- **DBA:** _______________ Fecha: _______________

### Post-Despliegue
- **DevOps:** _______________ Fecha: _______________
- **QA:** _______________ Fecha: _______________
- **Product Owner:** _______________ Fecha: _______________

---

## 📞 Contactos de Emergencia

**Desarrollador Principal:** [Nombre] - [Email] - [Teléfono]  
**DevOps On-Call:** [Nombre] - [Email] - [Teléfono]  
**DBA On-Call:** [Nombre] - [Email] - [Teléfono]  
**Manager:** [Nombre] - [Email] - [Teléfono]

**Canal de Slack:** #security-fixes  
**Sistema de Tickets:** [URL]

---

**Última Actualización:** 5 de febrero de 2026  
**Versión del Checklist:** 1.0
