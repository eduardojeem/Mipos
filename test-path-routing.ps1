# Script para probar path-based routing

Write-Host "🧪 Probando Path-Based Routing..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://miposparaguay.vercel.app"

# Probar dominio principal
Write-Host "1. Probando dominio principal..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "   ✅ $baseUrl → Status: $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Probar path-based routing
$slugs = @("bfjeem", "acme-corp", "globex")

foreach ($slug in $slugs) {
    $url = "$baseUrl/$slug/home"
    Write-Host "2. Probando: $url" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
        Write-Host "   ✅ Status: $($response.StatusCode)" -ForegroundColor Green
        
        # Verificar si hay contenido
        if ($response.Content.Length -gt 0) {
            Write-Host "   ✅ Contenido: $($response.Content.Length) bytes" -ForegroundColor Green
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "   ❌ Status: $statusCode" -ForegroundColor Red
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "📝 Notas:" -ForegroundColor Cyan
Write-Host "   - Si ves 404, el middleware no está detectando la organización" -ForegroundColor White
Write-Host "   - Si ves 500, hay un error en el servidor" -ForegroundColor White
Write-Host "   - Si ves 200, ¡funciona correctamente!" -ForegroundColor White
Write-Host ""

Read-Host "Presiona Enter para salir"
