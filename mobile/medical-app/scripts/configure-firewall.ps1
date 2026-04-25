# Script para configurar el Firewall de Windows para RespiCare
# IMPORTANTE: Ejecutar como Administrador

Write-Host "🔥 Configurando Firewall de Windows para RespiCare..." -ForegroundColor Cyan
Write-Host ""

# Verificar si se está ejecutando como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Solución:" -ForegroundColor Yellow
    Write-Host "   1. Cierra PowerShell"
    Write-Host "   2. Haz clic derecho en PowerShell"
    Write-Host "   3. Selecciona 'Ejecutar como administrador'"
    Write-Host "   4. Ejecuta este script nuevamente"
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host "✅ Ejecutando como Administrador" -ForegroundColor Green
Write-Host ""

# Puerto 3001 - Backend
Write-Host "📡 Configurando puerto 3001 (Backend)..." -ForegroundColor Yellow
try {
    $existingRule = Get-NetFirewallRule -DisplayName "RespiCare Backend" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName "RespiCare Backend" -ErrorAction SilentlyContinue
        Write-Host "   Regla existente eliminada" -ForegroundColor Gray
    }
    
    New-NetFirewallRule -DisplayName "RespiCare Backend" `
        -Direction Inbound `
        -LocalPort 3001 `
        -Protocol TCP `
        -Action Allow `
        -Description "Permite conexiones al backend de RespiCare en puerto 3001" `
        -ErrorAction Stop
    
    Write-Host "   ✅ Puerto 3001 configurado correctamente" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error configurando puerto 3001: $_" -ForegroundColor Red
}

Write-Host ""

# Puerto 8000 - AI Services
Write-Host "📡 Configurando puerto 8000 (AI Services)..." -ForegroundColor Yellow
try {
    $existingRule = Get-NetFirewallRule -DisplayName "RespiCare AI Services" -ErrorAction SilentlyContinue
    if ($existingRule) {
        Remove-NetFirewallRule -DisplayName "RespiCare AI Services" -ErrorAction SilentlyContinue
        Write-Host "   Regla existente eliminada" -ForegroundColor Gray
    }
    
    New-NetFirewallRule -DisplayName "RespiCare AI Services" `
        -Direction Inbound `
        -LocalPort 8000 `
        -Protocol TCP `
        -Action Allow `
        -Description "Permite conexiones al servicio de IA de RespiCare en puerto 8000" `
        -ErrorAction Stop
    
    Write-Host "   ✅ Puerto 8000 configurado correctamente" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error configurando puerto 8000: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Configuración del Firewall completada" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen de reglas creadas:" -ForegroundColor Cyan
Get-NetFirewallRule -DisplayName "RespiCare*" | Format-Table DisplayName, Enabled, Direction, Action, Protocol, LocalPort -AutoSize

Write-Host ""
Write-Host "💡 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Verifica que Docker esté corriendo: docker ps"
Write-Host "   2. Prueba la conexión: npm run test:connection"
Write-Host "   3. Si todo está bien, recompila la app: npm run build"
Write-Host ""

Read-Host "Presiona Enter para salir"

