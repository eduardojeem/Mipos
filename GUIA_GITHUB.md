# 📚 Guía para Subir el Proyecto a GitHub

## ✅ Preparación Completada

Ya se han realizado los siguientes pasos:
- ✅ Eliminado historial de Git anterior
- ✅ Eliminado archivos innecesarios
- ✅ Creado `.gitignore` completo
- ✅ Limpiado credenciales del `.env.example`
- ✅ Creado README.md

## 🚀 Pasos para Subir a GitHub

### 1. Crear Repositorio en GitHub

1. Ve a [GitHub](https://github.com)
2. Haz clic en el botón **"+"** (arriba derecha) → **"New repository"**
3. Completa los datos:
   - **Repository name**: `beauty-pos-system` (o el nombre que prefieras)
   - **Description**: "Sistema POS para gestión de negocios de belleza"
   - **Visibility**: Elige **Private** (recomendado) o **Public**
   - ⚠️ **NO marques** "Initialize this repository with a README"
4. Haz clic en **"Create repository"**

### 2. Inicializar Git Local

Abre la terminal en la carpeta del proyecto y ejecuta:

```bash
git init
```

### 3. Agregar Archivos al Staging

```bash
git add .
```

### 4. Hacer el Primer Commit

```bash
git commit -m "Initial commit: Beauty POS System"
```

### 5. Conectar con GitHub

Copia la URL de tu repositorio de GitHub (aparece después de crearlo) y ejecuta:

```bash
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
```

**Ejemplo:**
```bash
git remote add origin https://github.com/juanperez/beauty-pos-system.git
```

### 6. Cambiar a la Rama Main (si es necesario)

```bash
git branch -M main
```

### 7. Subir el Código

```bash
git push -u origin main
```

### 8. Autenticación

GitHub te pedirá autenticación. Tienes dos opciones:

#### Opción A: Personal Access Token (Recomendado)
1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con permisos de `repo`
3. Copia el token
4. Úsalo como contraseña cuando Git te lo pida

#### Opción B: GitHub CLI
```bash
gh auth login
```

## ⚠️ IMPORTANTE: Archivos que NO se subirán

Estos archivos están en `.gitignore` y NO se subirán (es correcto):

- ❌ `node_modules/` - Dependencias (se instalan con npm install)
- ❌ `.env`, `.env.local` - Credenciales sensibles
- ❌ `.next/`, `dist/`, `build/` - Archivos compilados
- ❌ `*.db` - Bases de datos locales
- ❌ `.kiro/`, `.agent/` - Archivos de desarrollo

## 🔐 Configurar Variables de Entorno en Producción

Si vas a desplegar en Vercel, Netlify u otro servicio:

1. Ve a la configuración del proyecto en la plataforma
2. Busca la sección **"Environment Variables"**
3. Agrega las variables del archivo `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - etc.

## 📝 Comandos Útiles de Git

```bash
# Ver estado de los archivos
git status

# Ver historial de commits
git log --oneline

# Crear una nueva rama
git checkout -b nombre-rama

# Cambiar de rama
git checkout main

# Actualizar desde GitHub
git pull origin main

# Subir cambios
git add .
git commit -m "Descripción del cambio"
git push origin main
```

## 🆘 Solución de Problemas

### Error: "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
```

### Error: "failed to push some refs"
```bash
git pull origin main --rebase
git push origin main
```

### Olvidé agregar algo al .gitignore
```bash
# Agregar al .gitignore primero, luego:
git rm -r --cached .
git add .
git commit -m "Update .gitignore"
git push origin main
```

## ✅ Verificación Final

Después de subir, verifica en GitHub que:
- ✅ El código está completo
- ✅ NO hay archivos `.env` con credenciales
- ✅ NO hay carpetas `node_modules`
- ✅ El README.md se ve correctamente

## 🎉 ¡Listo!

Tu proyecto ya está en GitHub y listo para colaborar o desplegar.

---

**Nota**: Recuerda nunca subir credenciales reales. Usa siempre variables de entorno.
