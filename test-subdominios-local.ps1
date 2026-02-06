# Script para probar subdominios locales
# No requiere permisos de administrador

Write-Host "🧪 Probando subdominios locales de MiPOS..." -ForegroundColor Cyan
Write-Host ""

# Verificar que el servidor esté corriendo
Write-Host "🔍 Verificando servidor local..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Servidor corriendo en http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "❌ Servidor no está corriendo en http://localhost:3000" -ForegroundColor Red
    Write-Host ""
    Write-Host "Ejecuta primero: npm run dev" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit
}

Write-Host ""
Write-Host "🌐 Probando subdominios..." -ForegroundColor Cyan
Write-Host ""

# Subdominios a probar
$subdominios = @(
    @{name="BFJEEM"; url="bfjeem.localhost:3000"},
    @{name="John Espinoza"; url="john-espinoza-org.localhost:3000"},
    @{name="Acme Corp"; url="acme-corp.localhost:3000"},
    @{name="Globex"; url="globex.localhost:3000"},
    @{name="Main Org"; url="main-org.localhost:3000"},
    @{name="Soylent"; url="soylent.localhost:3000"}
)

$exitosos = 0
$fallidos = 0

foreach ($sub in $subdominios) {
    $url = "http://$($sub.url)/home"
    Write-Host "Testing: $($sub.name)" -ForegroundColor Yellow -NoNewline
    Write-Host " → " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ OK (200)" -ForegroundColor Green
            $exitosos++
        } else {
            Write-Host "⚠️  Status: $($response.StatusCode)" -ForegroundColor Yellow
            $fallidos++
        }
    } catch {
        Write-Host "❌ Error" -ForegroundColor Red
        Write-Host "   $($_.Exception.Message)" -ForegroundColor DarkGray
        $fallidos++
    }
}

# Resumen
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📊 Resumen de pruebas:" -ForegroundColor Cyan
Write-Host "   ✅ Exitosos: $exitosos" -ForegroundColor Green
Write-Host "   ❌ Fallidos: $fallidos" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

if ($fallidos -gt 0) {
    Write-Host ""
    Write-Host "💡 Soluciones:" -ForegroundColor Yellow
    Write-Host "   1. Verifica que ejecutaste setup-hosts-local.ps1 como Admin" -ForegroundColor White
    Write-Host "   2. Ejecuta: ipconfig /flushdns" -ForegroundColor White
    Write-Host "   3. Reinicia el navegador" -ForegroundColor White
    Write-Host "   4. Verifica que npm run dev esté corriendo" -ForegroundColor White
}

Write-Host ""
Read-Host "Presiona Enter para salir"
