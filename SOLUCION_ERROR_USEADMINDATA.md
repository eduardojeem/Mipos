# Solución al Error: useAdminData is not a function

## Problema
Después de recrear el archivo `useAdminData.ts`, Next.js no detectó correctamente el cambio y el hot reload falló.

## Solución

### Opción 1: Reiniciar el Servidor de Desarrollo (Recomendado)

1. **Detener el servidor** (Ctrl+C en la terminal donde corre `npm run dev`)
2. **Limpiar caché de Next.js**:
   ```bash
   cd apps/frontend
   rm -rf .next
   ```
3. **Reiniciar el servidor**:
   ```bash
   npm run dev
   ```

### Opción 2: Forzar Recarga sin Reiniciar

Si no puedes reiniciar el servidor, intenta:

1. **Hacer un cambio mínimo** en el archivo `useAdminData.ts`:
   - Agregar un espacio o comentario
   - Guardar el archivo
   - Esto debería forzar el hot reload

2. **Refrescar el navegador** con Ctrl+Shift+R (hard refresh)

### Opción 3: Limpiar Todo y Reinstalar

Si el problema persiste:

```bash
cd apps/frontend

# Limpiar todo
rm -rf .next
rm -rf node_modules/.cache

# Reinstalar dependencias (solo si es necesario)
npm install

# Reiniciar
npm run dev
```

## Verificación

Después de reiniciar, verifica que el hook se importa correctamente:

```typescript
// En apps/frontend/src/app/superadmin/page.tsx
import { useAdminData } from '@/app/superadmin/hooks/useAdminData';

// Debería funcionar sin errores
const { organizations, stats, loading } = useAdminData({
  autoRefresh: false,
  refreshInterval: 5 * 60 * 1000,
});
```

## Causa del Problema

El archivo `useAdminData.ts` fue eliminado y recreado durante la optimización. Next.js mantiene módulos en caché y el hot reload no siempre detecta cuando un archivo es completamente reemplazado (delete + create) en lugar de modificado.

## Prevención Futura

Para evitar este problema en el futuro:
- Usar `strReplace` en lugar de `deleteFile` + `fsWrite` cuando sea posible
- Reiniciar el servidor después de cambios estructurales grandes
- Usar `touch` para forzar recarga: `touch apps/frontend/src/app/superadmin/hooks/useAdminData.ts`

## Estado Actual

✅ El archivo `useAdminData.ts` está correctamente formado
✅ No hay errores de TypeScript
✅ La exportación es correcta
❌ Next.js necesita reiniciar para detectar el módulo

**Acción requerida**: Reiniciar el servidor de desarrollo.
