# Script para configurar subdominios locales en Windows
# Ejecutar como Administrador

Write-Host "🚀 Configurando subdominios locales para MiPOS..." -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pasos:" -ForegroundColor Yellow
    Write-Host "1. Click derecho en PowerShell" -ForegroundColor Yellow
    Write-Host "2. Selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
    Write-Host "3. Ejecuta este script de nuevo" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit
}

# Ruta del archivo hosts
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"

# Subdominios a agregar
$subdominios = @(
    "bfjeem",
    "john-espinoza-org",
    "acme-corp",
    "globex",
    "main-org",
    "soylent"
)

Write-Host "📝 Leyendo archivo hosts actual..." -ForegroundColor Yellow

# Leer contenido actual
$hostsContent = Get-Content $hostsPath -Raw

# Verificar si ya existen entradas de MiPOS
if ($hostsContent -match "# MiPOS Subdominios") {
    Write-Host "⚠️  Ya existen entradas de MiPOS en el archivo hosts" -ForegroundColor Yellow
    $respuesta = Read-Host "¿Deseas reemplazarlas? (s/n)"
    
    if ($respuesta -ne "s") {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        Read-Host "Presiona Enter para salir"
        exit
    }
    
    # Remover entradas antiguas
    $hostsContent = $hostsContent -replace "(?ms)# MiPOS Subdominios.*?# Fin MiPOS Subdominios\r?\n", ""
}

# Crear nuevas entradas
$nuevasEntradas = "`n# MiPOS Subdominios - Generado automáticamente`n"
$nuevasEntradas += "127.0.0.1 localhost`n"

foreach ($sub in $subdominios) {
    $nuevasEntradas += "127.0.0.1 $sub.localhost`n"
    Write-Host "  ✅ Agregando: $sub.localhost" -ForegroundColor Green
}

$nuevasEntradas += "# Fin MiPOS Subdominios`n"

# Agregar al archivo hosts
$hostsContent += $nuevasEntradas

# Guardar archivo
try {
    Set-Content -Path $hostsPath -Value $hostsContent -NoNewline
    Write-Host ""
    Write-Host "✅ Archivo hosts actualizado correctamente" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Error al actualizar archivo hosts: $_" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit
}

# Limpiar caché DNS
Write-Host ""
Write-Host "🔄 Limpiando caché DNS..." -ForegroundColor Yellow
try {
    ipconfig /flushdns | Out-Null
    Write-Host "✅ Caché DNS limpiado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No se pudo limpiar el caché DNS" -ForegroundColor Yellow
}

# Mostrar resumen
Write-Host ""
Write-Host "🎉 ¡Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Subdominios configurados:" -ForegroundColor Cyan
foreach ($sub in $subdominios) {
    Write-Host "   http://$sub.localhost:3000/home" -ForegroundColor White
}

Write-Host ""
Write-Host "🚀 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Ejecuta: npm run dev" -ForegroundColor White
Write-Host "   2. Abre: http://bfjeem.localhost:3000/home" -ForegroundColor White
Write-Host "   3. Verifica que muestra datos de la organización BFJEEM" -ForegroundColor White

Write-Host ""
Read-Host "Presiona Enter para salir"
