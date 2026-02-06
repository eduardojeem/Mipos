# 🧪 Guía: Probar Subdominios Localmente

**Objetivo:** Probar el sistema multitenancy con subdominios en tu máquina local

---

## 🎯 MÉTODO 1: Editar archivo hosts (Recomendado)

Este método simula subdominios reales en tu máquina.

### Para Windows:

1. **Abrir archivo hosts como Administrador:**
   - Presiona `Win + X` → Click en "Terminal (Admin)" o "PowerShell (Admin)"
   - O busca "Notepad" → Click derecho → "Ejecutar como administrador"
   - Abre: `C:\Windows\System32\drivers\etc\hosts`

2. **Agregar subdominios locales:**

```
# Subdominios para MiPOS (agregar al final del archivo)
127.0.0.1 localhost
127.0.0.1 bfjeem.localhost
127.0.0.1 john-espinoza-org.localhost
127.0.0.1 acme-corp.localhost
127.0.0.1 globex.localhost
127.0.0.1 main-org.localhost
127.0.0.1 soylent.localhost
```

3. **Guardar el archivo** (requiere permisos de administrador)

4. **Limpiar caché DNS:**
```powershell
ipconfig /flushdns
```

### Para Mac/Linux:

1. **Abrir terminal**

2. **Editar archivo hosts:**
```bash
sudo nano /etc/hosts
```

3. **Agregar subdominios:**
```
# Subdominios para MiPOS
127.0.0.1 localhost
127.0.0.1 bfjeem.localhost
127.0.0.1 john-espinoza-org.localhost
127.0.0.1 acme-corp.localhost
127.0.0.1 globex.localhost
127.0.0.1 main-org.localhost
127.0.0.1 soylent.localhost
```

4. **Guardar:** `Ctrl + O`, `Enter`, `Ctrl + X`

5. **Limpiar caché DNS:**
```bash
# Mac
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux
sudo systemd-resolve --flush-caches
```

---

## 🚀 MÉTODO 2: Usar herramienta local-ssl-proxy

Para tener SSL local (https):

```bash
# Instalar
npm install -g local-ssl-proxy

# Ejecutar tu app en puerto 3000
npm run dev

# En otra terminal, crear proxy SSL
local-ssl-proxy --source 3001 --target 3000
```

Ahora accede a: `https://localhost:3001`

---

## 🧪 PROBAR SUBDOMINIOS LOCALMENTE

### 1. Iniciar tu aplicación:

```bash
# En la raíz del proyecto
npm run dev

# O específicamente el frontend
cd apps/frontend
npm run dev
```

### 2. Acceder a los subdominios:

```
✅ App principal:
http://localhost:3000

✅ Subdominios (después de editar hosts):
http://bfjeem.localhost:3000/home
http://john-espinoza-org.localhost:3000/home
http://acme-corp.localhost:3000/home
http://globex.localhost:3000/home
http://main-org.localhost:3000/home
http://soylent.localhost:3000/home
```

### 3. Verificar que funciona:

Cada subdominio debe:
- ✅ Mostrar solo los productos de esa organización
- ✅ Mostrar el nombre de la organización
- ✅ Tener configuración independiente
- ✅ No mostrar datos de otras organizaciones

---

## 🔍 VERIFICAR DETECCIÓN DE ORGANIZACIÓN

### Abrir DevTools (F12) y ver Console:

Deberías ver logs como:

```
ℹ️  Using default organization in development: MiPOS BFJEEM
✅ Organization detected: MiPOS BFJEEM (bfjeem)
```

### Verificar Cookies:

En DevTools → Application → Cookies → `http://localhost:3000`:

```
x-organization-id: [uuid]
x-organization-name: MiPOS BFJEEM
x-organization-slug: bfjeem
```

---

## 🐛 TROUBLESHOOTING LOCAL

### Problema: "No organization context found"

**Causa:** El middleware no detecta la organización en localhost

**Solución:** El middleware ya tiene lógica para usar organización por defecto en desarrollo:

```typescript
// En middleware.ts
if (hostname.includes('localhost')) {
  // Usa la primera organización activa
}
```

### Problema: Subdominios no funcionan

**Causa:** Archivo hosts no actualizado o caché DNS

**Solución:**
```powershell
# Windows
ipconfig /flushdns

# Mac
sudo dscacheutil -flushcache

# Linux
sudo systemd-resolve --flush-caches
```

### Problema: "Cannot GET /home"

**Causa:** La ruta no existe o el middleware no está reescribiendo

**Solución:**
1. Verifica que el archivo `apps/frontend/middleware.ts` existe
2. Reinicia el servidor de desarrollo
3. Verifica logs en la consola

### Problema: Veo datos de otra organización

**Causa:** Las queries no filtran por organization_id

**Solución:**
```bash
# Ejecutar script de verificación
npx tsx scripts/verify-public-pages-saas.ts
```

---

## 📊 SCRIPT DE PRUEBA AUTOMÁTICO

Crea este script para probar todos los subdominios:

```bash
# test-subdominios.sh (Mac/Linux)
#!/bin/bash

echo "🧪 Probando subdominios locales..."

subdominios=("bfjeem" "john-espinoza-org" "acme-corp" "globex" "main-org" "soylent")

for sub in "${subdominios[@]}"
do
  echo ""
  echo "Testing: http://$sub.localhost:3000/home"
  curl -s -o /dev/null -w "Status: %{http_code}\n" "http://$sub.localhost:3000/home"
done

echo ""
echo "✅ Pruebas completadas"
```

```powershell
# test-subdominios.ps1 (Windows)
Write-Host "🧪 Probando subdominios locales..." -ForegroundColor Cyan

$subdominios = @("bfjeem", "john-espinoza-org", "acme-corp", "globex", "main-org", "soylent")

foreach ($sub in $subdominios) {
    Write-Host ""
    Write-Host "Testing: http://$sub.localhost:3000/home" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri "http://$sub.localhost:3000/home" -UseBasicParsing
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "Status: Error - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Pruebas completadas" -ForegroundColor Green
```

---

## 🎨 PROBAR PERSONALIZACIÓN

### 1. Acceder al dashboard de una organización:

```
http://localhost:3000/dashboard/settings
```

### 2. Cambiar configuración:
- Logo
- Colores
- Nombre de la empresa

### 3. Ver cambios en página pública:

```
http://bfjeem.localhost:3000/home
```

Los cambios deben reflejarse inmediatamente.

---

## 📱 PROBAR EN DISPOSITIVOS MÓVILES (MISMA RED)

### 1. Obtener tu IP local:

```powershell
# Windows
ipconfig

# Busca "IPv4 Address" (ej: 192.168.1.100)
```

```bash
# Mac/Linux
ifconfig | grep "inet "

# O
ip addr show
```

### 2. Agregar IP en archivo hosts del móvil:

**Android (requiere root):**
```
# /etc/hosts
192.168.1.100 bfjeem.localhost
192.168.1.100 acme-corp.localhost
```

**iOS (requiere jailbreak o app):**
- Usar app como "Surge" o "Shadowrocket"

### 3. Acceder desde móvil:

```
http://192.168.1.100:3000/home
```

---

## 🔐 PROBAR CON HTTPS LOCAL (Opcional)

### Usar mkcert para certificados locales:

```bash
# Instalar mkcert
# Windows (con Chocolatey)
choco install mkcert

# Mac
brew install mkcert

# Linux
sudo apt install mkcert

# Crear certificados
mkcert -install
mkcert localhost "*.localhost" 127.0.0.1 ::1

# Configurar Next.js para usar HTTPS
# Crear server.js en apps/frontend/
```

```javascript
// apps/frontend/server.js
const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: fs.readFileSync('./localhost-key.pem'),
  cert: fs.readFileSync('./localhost.pem')
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready on https://localhost:3000')
  })
})
```

```bash
# Ejecutar
node server.js
```

Ahora accede a: `https://bfjeem.localhost:3000/home`

---

## ✅ CHECKLIST DE PRUEBAS LOCALES

- [ ] Archivo hosts actualizado con subdominios
- [ ] Caché DNS limpiado
- [ ] Servidor de desarrollo corriendo (`npm run dev`)
- [ ] Acceso a `http://localhost:3000` funciona
- [ ] Acceso a `http://bfjeem.localhost:3000/home` funciona
- [ ] Cada subdominio muestra datos diferentes
- [ ] Cookies `x-organization-*` se establecen correctamente
- [ ] Logs en consola muestran organización detectada
- [ ] Personalización por organización funciona
- [ ] No hay errores en DevTools Console

---

## 🎉 RESULTADO ESPERADO

Después de configurar todo, deberías poder:

✅ Acceder a múltiples subdominios localmente  
✅ Ver datos aislados por organización  
✅ Probar personalización en tiempo real  
✅ Verificar que el middleware funciona correctamente  
✅ Desarrollar sin necesidad de deploy constante

---

## 📝 NOTAS IMPORTANTES

### Desarrollo vs Producción:

**Local (desarrollo):**
```
http://bfjeem.localhost:3000/home
```

**Producción (Vercel):**
```
https://bfjeem.miposparaguay.vercel.app/home
```

### Middleware detecta automáticamente:

- **Local:** Usa organización por defecto si no detecta subdomain
- **Producción:** Requiere subdomain válido o devuelve 404

### Variables de entorno:

Asegúrate de tener en `.env.local`:
```env
NEXT_PUBLIC_BASE_DOMAIN="miposparaguay.vercel.app"
```

Esto NO afecta el desarrollo local, solo producción.

---

## 🚀 COMANDOS RÁPIDOS

```bash
# Iniciar desarrollo
npm run dev

# Limpiar caché DNS (Windows)
ipconfig /flushdns

# Ver logs del middleware
# Abre DevTools → Console

# Probar subdominio
curl http://bfjeem.localhost:3000/home

# Ver cookies
# DevTools → Application → Cookies
```

---

**¡Listo para desarrollar con subdominios localmente!** 🎉

**Preparado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026
