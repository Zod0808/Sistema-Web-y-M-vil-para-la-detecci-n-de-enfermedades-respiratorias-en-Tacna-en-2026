# Script para instalar k6 manualmente (descarga desde GitHub)
# No requiere permisos de administrador
# Ejecutar: .\scripts\install-k6-manual.ps1

Write-Host "🚀 Instalando k6 manualmente desde GitHub..." -ForegroundColor Cyan

# URL de la última versión (actualizar si es necesario)
$k6Version = "v0.50.0"
$k6Url = "https://github.com/grafana/k6/releases/download/$k6Version/k6-$k6Version-windows-amd64.zip"
$k6Dir = "$env:USERPROFILE\k6"
$k6Zip = "$env:TEMP\k6.zip"

Write-Host "📥 Descargando k6 $k6Version..." -ForegroundColor Cyan
Write-Host "   URL: $k6Url" -ForegroundColor Gray

try {
    # Descargar k6
    Invoke-WebRequest -Uri $k6Url -OutFile $k6Zip -UseBasicParsing
    
    # Crear directorio si no existe
    if (-not (Test-Path $k6Dir)) {
        New-Item -ItemType Directory -Path $k6Dir -Force | Out-Null
        Write-Host "✅ Directorio creado: $k6Dir" -ForegroundColor Green
    }
    
    # Extraer archivo
    Write-Host "📦 Extrayendo archivos..." -ForegroundColor Cyan
    Expand-Archive -Path $k6Zip -DestinationPath $k6Dir -Force
    
    # Limpiar archivo temporal
    Remove-Item $k6Zip -Force
    
    Write-Host "✅ k6 extraído correctamente" -ForegroundColor Green
    
    # Agregar al PATH del usuario
    Write-Host "🔧 Agregando k6 al PATH del usuario..." -ForegroundColor Cyan
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -notlike "*$k6Dir*") {
        $newPath = "$currentPath;$k6Dir"
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "✅ k6 agregado al PATH" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE: Cierra y vuelve a abrir todas las terminales para que el PATH tome efecto." -ForegroundColor Yellow
    } else {
        Write-Host "✅ k6 ya está en el PATH" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "🎉 ¡Instalación completada!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Después de cerrar y abrir la terminal, ejecuta:" -ForegroundColor Yellow
    Write-Host "   k6 version" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Para probar, ejecuta:" -ForegroundColor Yellow
    Write-Host "   k6 run --vus 1 --duration 1s https://httpbin.org/get" -ForegroundColor White
    
} catch {
    Write-Host "❌ Error durante la instalación: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Intenta manualmente:" -ForegroundColor Yellow
    Write-Host "   1. Descarga desde: https://github.com/grafana/k6/releases" -ForegroundColor White
    Write-Host "   2. Extrae a: $k6Dir" -ForegroundColor White
    Write-Host "   3. Agrega $k6Dir al PATH del usuario" -ForegroundColor White
    exit 1
}

