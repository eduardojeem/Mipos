Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Reiniciando servidor de desarrollo" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location apps\frontend

Write-Host "Limpiando cache de Next.js..." -ForegroundColor Yellow
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "Cache eliminado" -ForegroundColor Green
} else {
    Write-Host "No hay cache para eliminar" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host ""
npm run dev
