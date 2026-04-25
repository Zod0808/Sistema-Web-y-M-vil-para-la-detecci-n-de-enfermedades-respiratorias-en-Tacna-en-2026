# Script para detener procesos que usan un puerto especifico
# Uso: .\scripts\kill-port.ps1 -Port 3001

param(
    [Parameter(Mandatory=$true)]
    [int]$Port
)

Write-Host "Buscando procesos usando el puerto $Port..." -ForegroundColor Cyan

# Obtener procesos que usan el puerto
$connections = netstat -ano | Select-String ":$Port\s" | Select-String "LISTENING"

if ($connections) {
    $pids = $connections | ForEach-Object {
        $_.ToString().Split()[-1]
    } | Select-Object -Unique

    Write-Host "Encontrados procesos: $($pids -join ', ')" -ForegroundColor Yellow

    foreach ($pid in $pids) {
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "Deteniendo proceso $pid ($($process.ProcessName))..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force
                Write-Host "Proceso $pid detenido" -ForegroundColor Green
            } else {
                Write-Host "Proceso $pid no encontrado (puede haber terminado)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Error deteniendo proceso $pid : $_" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "Puertos liberados. Puedes iniciar el backend ahora." -ForegroundColor Green
} else {
    Write-Host "No se encontraron procesos usando el puerto $Port" -ForegroundColor Green
}
