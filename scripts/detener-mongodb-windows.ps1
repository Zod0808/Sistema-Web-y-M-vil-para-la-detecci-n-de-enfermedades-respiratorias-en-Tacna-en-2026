# Script para detener MongoDB de Windows que está usando el puerto 27017
# Uso: .\scripts\detener-mongodb-windows.ps1

Write-Host "🔍 Verificando procesos de MongoDB en Windows..." -ForegroundColor Cyan

# Buscar procesos de MongoDB
$mongoProcesses = Get-Process -Name mongod -ErrorAction SilentlyContinue

if ($mongoProcesses) {
    Write-Host "⚠️  Se encontraron procesos de MongoDB corriendo:" -ForegroundColor Yellow
    $mongoProcesses | Format-Table Id, ProcessName, StartTime -AutoSize
    
    $response = Read-Host "¿Deseas detener estos procesos? (S/N)"
    
    if ($response -eq "S" -or $response -eq "s") {
        Write-Host "🛑 Deteniendo procesos de MongoDB..." -ForegroundColor Yellow
        $mongoProcesses | Stop-Process -Force
        Write-Host "✅ Procesos de MongoDB detenidos" -ForegroundColor Green
        
        # Esperar un momento para que el puerto se libere
        Start-Sleep -Seconds 2
        
        # Verificar que el puerto esté libre
        $portCheck = netstat -ano | findstr :27017
        if (-not $portCheck) {
            Write-Host "✅ Puerto 27017 liberado correctamente" -ForegroundColor Green
        } else {
            Write-Host "⚠️  El puerto 27017 aún está en uso. Puede que necesites reiniciar el servicio de MongoDB." -ForegroundColor Yellow
        }
    } else {
        Write-Host "ℹ️  No se detuvieron los procesos. Considera cambiar el puerto en docker-compose." -ForegroundColor Cyan
    }
} else {
    Write-Host "✅ No se encontraron procesos de MongoDB corriendo" -ForegroundColor Green
    
    # Verificar si el puerto está en uso
    $portCheck = netstat -ano | findstr :27017
    if ($portCheck) {
        Write-Host "⚠️  El puerto 27017 está en uso por otro proceso:" -ForegroundColor Yellow
        Write-Host $portCheck
        Write-Host ""
        Write-Host "💡 Opciones:" -ForegroundColor Cyan
        Write-Host "   1. Detener el proceso que usa el puerto"
        Write-Host "   2. Cambiar el puerto en docker-compose.dev.yml"
    } else {
        Write-Host "✅ Puerto 27017 está libre" -ForegroundColor Green
    }
}

