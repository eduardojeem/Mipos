# Simplificación del Perfil de Usuario

## Cambios Realizados

### Eliminación de "Exportar Datos del Perfil"

**Fecha:** 2026-02-01

**Motivo:** Simplificación de la interfaz de usuario según solicitud del usuario.

**Archivos Modificados:**

1. **apps/frontend/src/components/profile/profile-header.tsx**
   - Eliminado import de `DataExport`
   - Eliminado componente `<DataExport />` de los botones de acción
   - Ahora solo muestra: Actualizar, Editar Perfil, Cambiar Contraseña

2. **apps/frontend/src/components/profile/data-export.tsx**
   - Archivo eliminado completamente

**Resultado:**

La sección de perfil (`/dashboard/profile`) ahora tiene una interfaz más limpia sin el botón de "Exportar Datos del Perfil". Los usuarios pueden:

- Actualizar su perfil
- Editar información personal
- Cambiar contraseña
- Gestionar seguridad (2FA, sesiones activas)

**Nota:** Si en el futuro se necesita restaurar la funcionalidad de exportación de datos, se puede recuperar del historial de git.
