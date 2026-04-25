# Script PowerShell para obtener la IP local automáticamente

Write-Host "🔍 Detectando IP local de Windows..." -ForegroundColor Cyan
Write-Host ""

# Obtener todas las IPs
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Sort-Object -Property InterfaceAlias

if ($adapters.Count -eq 0) {
    Write-Host "❌ No se encontró ninguna IP local." -ForegroundColor Red
    exit 1
}

Write-Host "📡 Adaptadores de red encontrados:" -ForegroundColor Yellow
Write-Host ""

$wifiAdapters = @()
$ethernetAdapters = @()

foreach ($adapter in $adapters) {
    $interfaceAlias = $adapter.InterfaceAlias
    $ipAddress = $adapter.IPAddress
    
    if ($interfaceAlias -like "*Wi-Fi*" -or $interfaceAlias -like "*Wireless*" -or $interfaceAlias -like "*WLAN*") {
        $wifiAdapters += @{
            Name = $interfaceAlias
            IP = $ipAddress
        }
        Write-Host "  📶 Wi-Fi: $interfaceAlias - $ipAddress" -ForegroundColor Green
    }
    elseif ($interfaceAlias -like "*Ethernet*" -or $interfaceAlias -like "*LAN*") {
        $ethernetAdapters += @{
            Name = $interfaceAlias
            IP = $ipAddress
        }
        Write-Host "  🔌 Ethernet: $interfaceAlias - $ipAddress" -ForegroundColor Cyan
    }
    else {
        Write-Host "  🔗 Otro: $interfaceAlias - $ipAddress" -ForegroundColor Gray
    }
}

Write-Host ""

# Priorizar Wi-Fi sobre Ethernet
$selectedIP = $null
if ($wifiAdapters.Count -gt 0) {
    $selectedIP = $wifiAdapters[0].IP
    Write-Host "✅ IP seleccionada (Wi-Fi): $selectedIP" -ForegroundColor Green
} elseif ($ethernetAdapters.Count -gt 0) {
    $selectedIP = $ethernetAdapters[0].IP
    Write-Host "✅ IP seleccionada (Ethernet): $selectedIP" -ForegroundColor Green
} else {
    $selectedIP = $adapters[0].IPAddress
    Write-Host "✅ IP seleccionada: $selectedIP" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Configuración para .env.local:" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT_PUBLIC_API_URL=http://$selectedIP:3001/api/v1"
Write-Host "NEXT_PUBLIC_AI_SERVICE_URL=http://$selectedIP:8000"
Write-Host ""

Write-Host "💡 Para actualizar automáticamente el archivo .env.local, ejecuta:" -ForegroundColor Yellow
Write-Host "   npm run config:ip"
Write-Host ""

