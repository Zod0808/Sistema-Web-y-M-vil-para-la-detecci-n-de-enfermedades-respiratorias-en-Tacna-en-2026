# Script para instalar k6 usando Scoop (no requiere administrador)
# Ejecutar: .\scripts\install-k6-scoop.ps1

Write-Host "🚀 Instalando k6 usando Scoop..." -ForegroundColor Cyan

# Verificar si Scoop está instalado
if (-not (Get-Command scoop -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Scoop no está instalado. Instalando Scoop primero..." -ForegroundColor Yellow
    
    # Cambiar política de ejecución (si es necesario)
    $executionPolicy = Get-ExecutionPolicy -Scope CurrentUser
    if ($executionPolicy -eq "Restricted") {
        Write-Host "⚠️  Cambiando política de ejecución..." -ForegroundColor Yellow
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    }
    
    # Instalar Scoop
    Write-Host "📥 Descargando e instalando Scoop..." -ForegroundColor Cyan
    Invoke-RestMethod get.scoop.sh | Invoke-Expression
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error instalando Scoop. Por favor instala manualmente desde: https://scoop.sh/" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Scoop instalado correctamente" -ForegroundColor Green
} else {
    Write-Host "✅ Scoop ya está instalado" -ForegroundColor Green
}

# Instalar k6
Write-Host "📦 Instalando k6..." -ForegroundColor Cyan
scoop install k6

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ k6 instalado correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔍 Verificando instalación..." -ForegroundColor Cyan
    k6 version
    
    Write-Host ""
    Write-Host "🎉 ¡Instalación completada! Puedes usar k6 ahora." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Para probar, ejecuta:" -ForegroundColor Yellow
    Write-Host "   k6 run --vus 1 --duration 1s https://httpbin.org/get" -ForegroundColor White
} else {
    Write-Host "❌ Error instalando k6. Por favor intenta manualmente:" -ForegroundColor Red
    Write-Host "   scoop install k6" -ForegroundColor White
    exit 1
}

