# Reiniciar Servidor para Nuevas Rutas API

## Problema

Cuando se crean nuevas rutas API en Next.js (archivos `route.ts` en `/app/api/`), el servidor de desarrollo puede no detectarlas automáticamente y devolver error 404.

## Solución

**Debes reiniciar el servidor de desarrollo** para que Next.js detecte las nuevas rutas.

### Opción 1: Usar Scripts de Reinicio (Recomendado)

#### Windows CMD:
```cmd
reiniciar-dev.bat
```

#### Windows PowerShell:
```powershell
.\reiniciar-dev.ps1
```

### Opción 2: Reinicio Manual

1. **Detener el servidor:**
   - Presiona `Ctrl + C` en la terminal donde corre el servidor
   - Espera a que se detenga completamente

2. **Iniciar nuevamente:**
   ```bash
   npm run dev
   ```

## Rutas Nuevas Agregadas

Las siguientes rutas fueron creadas y requieren reinicio:

1. **GET** `/api/auth/organization/plan`
   - Obtiene el plan actual de la organización del usuario
   - Retorna detalles del plan (nombre, precio, límites, características)

2. **POST** `/api/auth/organization/request-plan-change`
   - Permite solicitar cambio de plan
   - Requiere `{ planSlug: string }` en el body

## Verificar que las Rutas Funcionan

Después de reiniciar, puedes verificar en el navegador:

1. Abre las DevTools (F12)
2. Ve a la pestaña Network
3. Navega a `/dashboard/profile` y selecciona la pestaña "Plan"
4. Deberías ver las llamadas a:
   - `/api/auth/organization/plan` (status 200 o 401)
   - `/api/plans` (status 200)

## Notas Importantes

- **Hot Reload no funciona** para nuevas rutas API
- **Solo afecta a rutas nuevas**, no a modificaciones de rutas existentes
- **En producción** esto no es problema (build completo)
- **Alternativa:** Usar `npm run build && npm run start` para probar en modo producción

## Error Común

```
AxiosError: Request failed with status code 404
at async loadPlanData (src\app\dashboard\profile\page.tsx:772:31)
```

**Causa:** El servidor no ha detectado la nueva ruta `/api/auth/organization/plan`

**Solución:** Reiniciar el servidor de desarrollo

## Archivos de las Nuevas Rutas

```
apps/frontend/src/app/api/auth/organization/
├── plan/
│   └── route.ts          (GET - obtener plan actual)
└── request-plan-change/
    └── route.ts          (POST - solicitar cambio)
```

## Después del Reinicio

Una vez reiniciado el servidor:

1. La pestaña "Plan" en el perfil debería cargar correctamente
2. Se mostrará el plan actual (si existe)
3. Se mostrarán los planes disponibles
4. El botón "Solicitar Cambio" funcionará

Si el usuario no tiene organización o plan asignado, se mostrará un mensaje apropiado sin errores.
