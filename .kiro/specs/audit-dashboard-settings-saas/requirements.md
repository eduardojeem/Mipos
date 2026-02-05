# Requirements: Auditoría Dashboard Settings para Multitenancy SaaS

## Introducción

Este documento define los requerimientos para auditar y corregir la sección `/dashboard/settings` para cumplir con los estándares de multitenancy SaaS. El sistema actual tiene vulnerabilidades críticas de seguridad donde las configuraciones del sistema no están aisladas por organización.

**Feature Name**: audit-dashboard-settings-saas  
**Prioridad**: CRÍTICA  
**Fecha de Creación**: 2026-02-05

### Contexto del Problema

La sección `/dashboard/settings` maneja 3 tipos de configuraciones:

1. **User Settings** (✅ OK): Configuraciones personales del usuario almacenadas en `user_settings`
2. **System Settings** (❌ CRÍTICO): Configuraciones del sistema almacenadas en tabla `business_config` sin `organization_id`
3. **Security Settings** (⚠️ REVISAR): Configuraciones de seguridad almacenadas en `user_metadata`

### Problema Crítico Identificado

**Endpoint**: `/api/system/settings`  
**Tabla**: `business_config`  
**Severidad**: CRÍTICA (1/10 en seguridad)

**Vulnerabilidades**:
1. ❌ Lee de tabla `business_config` sin filtrar por `organization_id`
2. ❌ No valida permisos de administrador
3. ❌ Configuración global compartida entre todas las organizaciones
4. ❌ Usa `.single()` asumiendo una sola fila global
5. ❌ No hay aislamiento de datos entre organizaciones

**Impacto en Producción**:
- Organización A configura `businessName: "Empresa A"`
- Organización B configura `businessName: "Empresa B"`
- ❌ La última escritura sobrescribe la anterior
- ❌ Ambas organizaciones ven la misma configuración

## Glossario

- **System**: El sistema SaaS multi-tenant completo
- **Organization**: Una entidad de negocio que usa el sistema (tenant)
- **Admin**: Usuario con rol de administrador dentro de una organización
- **Super_Admin**: Usuario con acceso a todas las organizaciones
- **System_Settings**: Configuraciones de negocio específicas de una organización
- **Security_Settings**: Configuraciones de seguridad (scope a determinar)
- **User_Settings**: Configuraciones personales del usuario
- **RLS**: Row Level Security - Políticas de seguridad a nivel de base de datos
- **business_config**: Tabla actual que almacena configuraciones del sistema (sin multitenancy)
- **settings**: Tabla con soporte multitenancy (organization_id)

## Requerimientos

### Requerimiento 1: Aislamiento de System Settings por Organización

**User Story:** Como administrador de una organización, quiero que las configuraciones del sistema de mi organización estén completamente aisladas, para que no afecten ni sean afectadas por otras organizaciones.

#### Acceptance Criteria

1. WHEN un administrador consulta system settings, THE System SHALL retornar únicamente las configuraciones de su organización
2. WHEN un administrador actualiza system settings, THE System SHALL modificar únicamente las configuraciones de su organización
3. WHEN se crea una nueva organización, THE System SHALL crear configuraciones del sistema con valores predeterminados para esa organización
4. IF un administrador intenta acceder a configuraciones de otra organización, THEN THE System SHALL denegar el acceso con error 403
5. THE System SHALL almacenar system settings con columna `organization_id` NOT NULL

### Requerimiento 2: Validación de Permisos de Administrador

**User Story:** Como desarrollador del sistema, quiero que solo los administradores puedan modificar system settings, para garantizar la seguridad y control de configuraciones críticas.

#### Acceptance Criteria

1. WHEN un usuario no autenticado intenta acceder a system settings, THEN THE System SHALL retornar error 401
2. WHEN un usuario sin rol de administrador intenta acceder a system settings, THEN THE System SHALL retornar error 403
3. WHEN un administrador válido accede a system settings, THE System SHALL permitir lectura y escritura
4. THE System SHALL validar permisos usando la función `assertAdmin()` en todos los endpoints de system settings

### Requerimiento 3: Migración de Tabla business_config

**User Story:** Como arquitecto del sistema, quiero migrar las configuraciones existentes de `business_config` a un modelo multi-tenant, para corregir la vulnerabilidad de seguridad actual.

#### Acceptance Criteria

1. THE System SHALL agregar columna `organization_id` a la tabla `business_config` con tipo UUID NOT NULL
2. THE System SHALL crear constraint de clave foránea `organization_id REFERENCES organizations(id) ON DELETE CASCADE`
3. THE System SHALL crear unique constraint `(organization_id, key)` para prevenir duplicados
4. THE System SHALL migrar datos existentes asignándolos a organizaciones correspondientes
5. THE System SHALL crear índices en columna `organization_id` para optimizar consultas

### Requerimiento 4: Políticas RLS para business_config

**User Story:** Como ingeniero de seguridad, quiero que las políticas RLS garanticen el aislamiento de datos a nivel de base de datos, para prevenir accesos no autorizados incluso si hay errores en el código de aplicación.

#### Acceptance Criteria

1. THE System SHALL habilitar Row Level Security en tabla `business_config`
2. WHEN un usuario consulta `business_config`, THE System SHALL retornar únicamente filas donde `organization_id` coincida con las organizaciones del usuario
3. WHEN un administrador inserta en `business_config`, THE System SHALL validar que `organization_id` corresponda a una organización del usuario
4. WHEN un administrador actualiza `business_config`, THE System SHALL validar que `organization_id` corresponda a una organización del usuario
5. WHERE el usuario es Super_Admin, THE System SHALL permitir acceso a todas las organizaciones

### Requerimiento 5: Actualización de Endpoint /api/system/settings

**User Story:** Como desarrollador, quiero que el endpoint `/api/system/settings` implemente correctamente multitenancy, para corregir la vulnerabilidad crítica actual.

#### Acceptance Criteria

1. THE System SHALL extraer `organizationId` del usuario autenticado usando `getUserOrganizationId()`
2. THE System SHALL filtrar todas las consultas a `business_config` por `organization_id`
3. THE System SHALL reemplazar uso de `.single()` por consultas filtradas por organización
4. WHEN un Super_Admin proporciona parámetro `organizationId`, THE System SHALL permitir consultar configuraciones de esa organización
5. THE System SHALL registrar todas las modificaciones en audit log con contexto de organización

### Requerimiento 6: Decisión sobre Security Settings Scope

**User Story:** Como arquitecto del sistema, quiero determinar si security settings deben ser por usuario o por organización, para implementar el modelo de datos correcto.

#### Acceptance Criteria

1. THE System SHALL analizar si security settings (2FA, timeouts, intentos de login) deben aplicarse a nivel de usuario o organización
2. IF security settings son organizacionales, THEN THE System SHALL migrarlos de `user_metadata` a tabla `settings` con `organization_id`
3. IF security settings son por usuario, THEN THE System SHALL mantenerlos en `user_metadata` sin cambios
4. THE System SHALL documentar la decisión y justificación en el documento de diseño
5. THE System SHALL implementar el modelo de datos correspondiente a la decisión

### Requerimiento 7: Valores Predeterminados por Organización

**User Story:** Como administrador de una nueva organización, quiero que mi organización tenga configuraciones predeterminadas sensatas al crearse, para poder empezar a usar el sistema inmediatamente.

#### Acceptance Criteria

1. WHEN se crea una nueva organización, THE System SHALL crear un registro en `business_config` con valores predeterminados
2. THE System SHALL incluir configuraciones predeterminadas para: businessName, currency, timezone, language, taxRate, enableInventoryTracking
3. THE System SHALL usar valores regionales apropiados (Paraguay: PYG, America/Asuncion, es)
4. THE System SHALL permitir que los administradores modifiquen estos valores después de la creación
5. THE System SHALL documentar todos los valores predeterminados en el código

### Requerimiento 8: Compatibilidad con Migración Anterior

**User Story:** Como desarrollador, quiero que esta migración siga los mismos patrones que la migración exitosa de `/admin/settings`, para mantener consistencia en el código.

#### Acceptance Criteria

1. THE System SHALL usar el mismo patrón de RLS policies que la migración de `/admin/settings`
2. THE System SHALL reutilizar funciones helper `is_super_admin()` y `get_my_org_ids()` existentes
3. THE System SHALL seguir el mismo patrón de estructura de tabla `settings` con `(organization_id, key)` unique constraint
4. THE System SHALL usar `createClient()` en lugar de `createAdminClient()` para respetar RLS
5. THE System SHALL implementar audit logging consistente con otros endpoints

### Requerimiento 9: Pretty Printer para Configuraciones

**User Story:** Como desarrollador, quiero poder serializar y deserializar configuraciones de forma consistente, para garantizar integridad de datos en operaciones de lectura/escritura.

#### Acceptance Criteria

1. THE System SHALL definir un schema TypeScript para `SystemSettings` con todos los campos tipados
2. THE System SHALL implementar función de serialización que convierta `SystemSettings` a formato de base de datos
3. THE System SHALL implementar función de deserialización que convierta datos de base de datos a `SystemSettings`
4. THE System SHALL validar tipos de datos en serialización y deserialización
5. FOR ALL configuraciones válidas, serializar y luego deserializar SHALL producir un objeto equivalente (round-trip property)

## Fuera de Alcance

Los siguientes elementos están explícitamente fuera del alcance de esta auditoría:

- Rediseño de la interfaz de usuario de `/dashboard/settings`
- Agregar nuevas funcionalidades de configuración
- Migración de `user_settings` (ya está correctamente implementado por usuario)
- Optimizaciones de rendimiento más allá de índices básicos
- Implementación de caché distribuido
- Versionado de configuraciones
- Historial de cambios de configuraciones

## Dependencias

### Dependencias Externas
- Supabase debe estar disponible y funcionando
- Base de datos debe soportar RLS policies
- Tabla `organizations` debe existir con estructura correcta
- Tabla `organization_members` debe existir y estar poblada

### Dependencias Internas
- Función `assertAdmin()` en `/app/api/_utils/auth.ts`
- Función `getUserOrganizationId()` en `/app/api/_utils/organization.ts`
- Migración anterior de `/admin/settings` debe estar aplicada
- Tabla `settings` con soporte multitenancy debe existir
- Funciones helper `is_super_admin()` y `get_my_org_ids()` deben existir en base de datos

## Métricas de Éxito

### Métricas Primarias
- 100% de consultas a `business_config` filtran por `organization_id`
- 0 usos de `.single()` sin filtro de organización
- 100% de endpoints de system settings validan permisos con `assertAdmin()`
- Todas las tablas de configuración tienen RLS habilitado
- 0 fugas de datos entre organizaciones en pruebas

### Métricas Secundarias
- Tiempo de respuesta de endpoints < 500ms
- Todas las modificaciones registradas en audit log
- 100% de organizaciones tienen configuraciones predeterminadas
- 0 errores en producción después del despliegue

## Estrategia de Migración

### Fase 1: Preparación
1. Crear backup completo de tabla `business_config`
2. Documentar configuraciones actuales de todas las organizaciones
3. Preparar scripts de rollback

### Fase 2: Migración de Base de Datos
1. Agregar columna `organization_id` (nullable inicialmente)
2. Asignar configuraciones existentes a organizaciones
3. Hacer `organization_id` NOT NULL
4. Crear constraints y índices
5. Habilitar RLS policies

### Fase 3: Actualización de Código
1. Actualizar endpoint `/api/system/settings` GET
2. Actualizar endpoint `/api/system/settings` PUT
3. Agregar validación de permisos
4. Implementar extracción de `organizationId`
5. Agregar audit logging

### Fase 4: Testing
1. Tests unitarios de aislamiento de organizaciones
2. Tests de integración de endpoints
3. Tests manuales con múltiples organizaciones
4. Verificación de RLS policies
5. Tests de rendimiento

### Fase 5: Despliegue
1. Desplegar migración de base de datos
2. Desplegar cambios de API
3. Monitorear logs de errores
4. Verificar en producción
5. Confirmar aislamiento de datos

**Tiempo Estimado Total**: 4 horas

## Plan de Rollback

Si se descubren problemas críticos:

1. **Rollback de Base de Datos**:
   - Deshabilitar RLS policies
   - Restaurar desde backup
   - Verificar integridad de datos

2. **Rollback de Código**:
   - Revertir a commit anterior
   - Redesplegar versión anterior
   - Verificar funcionalidad

3. **Comunicación**:
   - Notificar a stakeholders
   - Documentar problemas encontrados
   - Planificar nueva ventana de despliegue
