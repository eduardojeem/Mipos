# ⚡ Inicio Rápido: Probar Subdominios Localmente

**Tiempo:** 5 minutos  
**Requisitos:** Windows con PowerShell

---

## 🚀 OPCIÓN 1: Configuración Automática (Recomendado)

### Paso 1: Configurar archivo hosts (1 min)

```powershell
# Click derecho en PowerShell → "Ejecutar como administrador"
.\setup-hosts-local.ps1
```

Esto agregará automáticamente:
```
127.0.0.1 bfjeem.localhost
127.0.0.1 john-espinoza-org.localhost
127.0.0.1 acme-corp.localhost
127.0.0.1 globex.localhost
127.0.0.1 main-org.localhost
127.0.0.1 soylent.localhost
```

### Paso 2: Iniciar servidor (1 min)

```powershell
# En PowerShell normal (no requiere admin)
npm run dev
```

### Paso 3: Probar subdominios (1 min)

```powershell
# En otra ventana de PowerShell
.\test-subdominios-local.ps1
```

### Paso 4: Abrir en navegador

```
http://bfjeem.localhost:3000/home
http://acme-corp.localhost:3000/home
http://globex.localhost:3000/home
```

---

## 🔧 OPCIÓN 2: Configuración Manual

### Paso 1: Editar archivo hosts

1. Abre Notepad como Administrador
2. Abre: `C:\Windows\System32\drivers\etc\hosts`
3. Agrega al final:

```
# MiPOS Subdominios
127.0.0.1 localhost
127.0.0.1 bfjeem.localhost
127.0.0.1 john-espinoza-org.localhost
127.0.0.1 acme-corp.localhost
127.0.0.1 globex.localhost
127.0.0.1 main-org.localhost
127.0.0.1 soylent.localhost
```

4. Guarda el archivo

### Paso 2: Limpiar caché DNS

```powershell
ipconfig /flushdns
```

### Paso 3: Iniciar servidor

```powershell
npm run dev
```

### Paso 4: Probar en navegador

```
http://bfjeem.localhost:3000/home
```

---

## ✅ Verificar que Funciona

### 1. Abrir DevTools (F12)

En la consola deberías ver:
```
✅ Organization detected: MiPOS BFJEEM (bfjeem)
```

### 2. Verificar Cookies

DevTools → Application → Cookies:
```
x-organization-id: [uuid]
x-organization-name: MiPOS BFJEEM
x-organization-slug: bfjeem
```

### 3. Verificar Datos

Cada subdominio debe mostrar:
- ✅ Solo productos de esa organización
- ✅ Nombre de la organización
- ✅ Configuración independiente

---

## 🐛 Problemas Comunes

### "No se puede acceder al sitio"

**Solución:**
```powershell
# Limpiar caché DNS
ipconfig /flushdns

# Reiniciar navegador
```

### "No organization context found"

**Solución:** El middleware usa organización por defecto en localhost. Esto es normal.

### Subdominios no funcionan

**Solución:**
1. Verifica que editaste el archivo hosts como Admin
2. Limpia caché DNS: `ipconfig /flushdns`
3. Reinicia el navegador

---

## 🎯 URLs de Prueba

```
✅ App principal:
http://localhost:3000

✅ Subdominios:
http://bfjeem.localhost:3000/home
http://bfjeem.localhost:3000/offers
http://bfjeem.localhost:3000/catalog

http://acme-corp.localhost:3000/home
http://globex.localhost:3000/home
```

---

## 📊 Comparación Local vs Producción

| Aspecto | Local | Producción |
|---------|-------|------------|
| **URL** | `http://bfjeem.localhost:3000` | `https://bfjeem.miposparaguay.vercel.app` |
| **SSL** | No (HTTP) | Sí (HTTPS) |
| **Configuración** | Archivo hosts | DNS real |
| **Detección** | Usa org por defecto | Requiere subdomain válido |

---

## 🚀 Comandos Útiles

```powershell
# Iniciar desarrollo
npm run dev

# Limpiar caché DNS
ipconfig /flushdns

# Ver archivo hosts
notepad C:\Windows\System32\drivers\etc\hosts

# Probar subdominios
.\test-subdominios-local.ps1

# Probar con curl
curl http://bfjeem.localhost:3000/home
```

---

## 🎉 ¡Listo!

Ahora puedes desarrollar con subdominios localmente sin necesidad de hacer deploy constante.

**Ventajas:**
- ✅ Desarrollo más rápido
- ✅ Pruebas inmediatas
- ✅ Sin costos de deploy
- ✅ Debugging más fácil

---

**Preparado por:** Kiro AI  
**Fecha:** 5 de febrero de 2026
