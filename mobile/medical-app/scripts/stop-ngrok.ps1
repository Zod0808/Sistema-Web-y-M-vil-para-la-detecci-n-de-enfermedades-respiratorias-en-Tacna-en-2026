# Script para detener todos los procesos de ngrok
# Uso: powershell -ExecutionPolicy Bypass -File scripts/stop-ngrok.ps1

Write-Host "🛑 Deteniendo ngrok..." -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

$ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue

if ($ngrokProcesses) {
    Write-Host "`n   Encontrados $($ngrokProcesses.Count) proceso(s) de ngrok" -ForegroundColor Yellow
    
    foreach ($process in $ngrokProcesses) {
        try {
            Write-Host "   Deteniendo proceso PID: $($process.Id)..." -ForegroundColor Gray
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
        } catch {
            Write-Host "   ⚠️  Error al detener PID $($process.Id): $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n   Esperando a que los procesos terminen..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
    
    # Verificar que se detuvieron
    $remaining = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    if ($remaining) {
        Write-Host "   ⚠️  Algunos procesos aún están corriendo. Forzando cierre..." -ForegroundColor Yellow
        try {
            Stop-Process -Name "ngrok" -Force -ErrorAction Stop
            Start-Sleep -Seconds 2
        } catch {
            Write-Host "   ⚠️  No se pudieron detener algunos procesos. Pueden estar en otra sesión." -ForegroundColor Yellow
        }
    }
    
    # Verificación final
    $finalCheck = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    if ($finalCheck) {
        Write-Host "   ⚠️  Aún hay $($finalCheck.Count) proceso(s) de ngrok corriendo." -ForegroundColor Yellow
        Write-Host "   Puedes detenerlos manualmente desde el Administrador de Tareas." -ForegroundColor Gray
    } else {
        Write-Host "   ✅ Todos los procesos de ngrok fueron detenidos" -ForegroundColor Green
    }
} else {
    Write-Host "`n   ℹ️  No hay procesos de ngrok corriendo" -ForegroundColor Gray
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ Listo" -ForegroundColor Green
Write-Host ""

