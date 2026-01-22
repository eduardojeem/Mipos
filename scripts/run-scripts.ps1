# Script PowerShell para ejecutar los scripts de roles en Windows
# Configura las variables de entorno y ejecuta los scripts TypeScript

param(
    [Parameter(Position=0)]
    [string]$Command,
    
    [Parameter(Position=1)]
    [string]$Param1,
    
    [Parameter(Position=2)]
    [string]$Param2,
    
    [switch]$Help
)

# Función para mostrar ayuda
function Show-Help {
    Write-Host ""
    Write-Host "🎯 Scripts de Gestión de Roles - Sistema POS" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\scripts\run-scripts.ps1 [comando] [opciones]" -ForegroundColor White
    Write-Host ""
    Write-Host "Comandos disponibles:" -ForegroundColor Yellow
    Write-Host "  check                    Ver todos los usuarios y roles" -ForegroundColor Green
    Write-Host "  check-role [ROLE]        Ver usuarios con rol específico" -ForegroundColor Green
    Write-Host "  sync                     Sincronizar roles (dry-run)" -ForegroundColor Green
    Write-Host "  sync-apply               Sincronizar roles (aplicar cambios)" -ForegroundColor Green
    Write-Host "  assign [EMAIL] [ROLE]    Asignar rol a usuario" -ForegroundColor Green
    Write-Host "  help                     Mostrar esta ayuda" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Yellow
    Write-Host "  .\scripts\run-scripts.ps1 check" -ForegroundColor Gray
    Write-Host "  .\scripts\run-scripts.ps1 check-role ADMIN" -ForegroundColor Gray
    Write-Host "  .\scripts\run-scripts.ps1 sync" -ForegroundColor Gray
    Write-Host "  .\scripts\run-scripts.ps1 assign usuario@empresa.com CASHIER" -ForegroundColor Gray
    Write-Host ""
}

# Mostrar ayuda si se solicita
if ($Help -or $Command -eq "help" -or [string]::IsNullOrEmpty($Command)) {
    Show-Help
    return
}

# Cargar variables de entorno desde .env
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "❌ Error: No se encontró el archivo .env" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en el directorio raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

# Verificar que las variables de entorno estén configuradas
if ([string]::IsNullOrEmpty($env:NEXT_PUBLIC_SUPABASE_URL)) {
    Write-Host "❌ Error: NEXT_PUBLIC_SUPABASE_URL no está configurada" -ForegroundColor Red
    Write-Host "   Verifica que el archivo .env existe y contiene las variables necesarias" -ForegroundColor Yellow
    exit 1
}

if ([string]::IsNullOrEmpty($env:SUPABASE_SERVICE_ROLE_KEY)) {
    Write-Host "❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada" -ForegroundColor Red
    Write-Host "   Verifica que el archivo .env existe y contiene las variables necesarias" -ForegroundColor Yellow
    exit 1
}

# Ejecutar comandos según el parámetro
switch ($Command.ToLower()) {
    "check" {
        if ([string]::IsNullOrEmpty($Param1)) {
            Write-Host "🔍 Verificando todos los usuarios y roles..." -ForegroundColor Cyan
            npx tsx scripts/check-user-roles.ts --show-permissions
        } else {
            Write-Host "🔍 Verificando usuarios con información detallada..." -ForegroundColor Cyan
            npx tsx scripts/check-user-roles.ts --show-permissions --verbose
        }
    }
    
    "check-role" {
        if ([string]::IsNullOrEmpty($Param1)) {
            Write-Host "❌ Error: Se requiere especificar el rol" -ForegroundColor Red
            Write-Host "   Uso: .\scripts\run-scripts.ps1 check-role [ROLE]" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "🔍 Verificando usuarios con rol $Param1..." -ForegroundColor Cyan
        npx tsx scripts/check-user-roles.ts --role=$Param1 --show-permissions
    }
    
    "sync" {
        Write-Host "🔄 Sincronizando roles (modo dry-run)..." -ForegroundColor Cyan
        npx tsx scripts/sync-roles-supabase-only.ts --dry-run --verbose
    }
    
    "sync-apply" {
        Write-Host "🔄 Sincronizando roles (aplicando cambios)..." -ForegroundColor Cyan
        npx tsx scripts/sync-roles-supabase-only.ts --verbose
    }
    
    "assign" {
        if ([string]::IsNullOrEmpty($Param1)) {
            Write-Host "❌ Error: Se requiere email del usuario" -ForegroundColor Red
            Write-Host "   Uso: .\scripts\run-scripts.ps1 assign [EMAIL] [ROLE]" -ForegroundColor Yellow
            exit 1
        }
        if ([string]::IsNullOrEmpty($Param2)) {
            Write-Host "❌ Error: Se requiere rol a asignar" -ForegroundColor Red
            Write-Host "   Uso: .\scripts\run-scripts.ps1 assign [EMAIL] [ROLE]" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "🎯 Asignando rol $Param2 al usuario $Param1..." -ForegroundColor Cyan
        npx tsx scripts/assign-role.ts --email=$Param1 --role=$Param2 --verbose
    }
    
    default {
        Write-Host "❌ Comando no reconocido: $Command" -ForegroundColor Red
        Write-Host ""
        Write-Host "Usa .\scripts\run-scripts.ps1 help para ver los comandos disponibles" -ForegroundColor Yellow
        exit 1
    }
}