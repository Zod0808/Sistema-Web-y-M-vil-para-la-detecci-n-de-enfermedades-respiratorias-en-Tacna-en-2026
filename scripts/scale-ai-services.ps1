# Script PowerShell para escalar servicios de AI en Docker Compose
# Uso: .\scripts\scale-ai-services.ps1 [número_de_instancias] [archivo_compose]

param(
    [int]$NumInstances = 2,
    [string]$ComposeFile = "docker-compose.prod.yml"
)

Write-Host "🚀 Escalando servicios AI a $NumInstances instancias..." -ForegroundColor Cyan

# Verificar que docker está disponible
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Docker no está instalado o no está en el PATH" -ForegroundColor Red
    exit 1
}

# Verificar que docker-compose está disponible
$composeCmd = $null
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if ($dockerVersion) {
        # Intentar usar docker compose (v2)
        $composeTest = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $composeCmd = "docker compose"
        } else {
            # Intentar usar docker-compose (v1)
            if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
                $composeCmd = "docker-compose"
            }
        }
    }
}

if (-not $composeCmd) {
    Write-Host "❌ Error: No se encontró docker-compose" -ForegroundColor Red
    exit 1
}

# Escalar el servicio
Write-Host "📈 Escalando ai-services a $NumInstances instancias usando $ComposeFile..." -ForegroundColor Yellow

if ($composeCmd -eq "docker compose") {
    docker compose -f $ComposeFile up -d --scale ai-services=$NumInstances --no-recreate
} else {
    docker-compose -f $ComposeFile up -d --scale ai-services=$NumInstances --no-recreate
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Servicios escalados exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Estado de los servicios:" -ForegroundColor Cyan
    
    if ($composeCmd -eq "docker compose") {
        docker compose -f $ComposeFile ps ai-services
    } else {
        docker-compose -f $ComposeFile ps ai-services
    }
    
    Write-Host ""
    Write-Host "💡 Nota: Asegúrate de que nginx.conf esté configurado para balancear carga entre las instancias" -ForegroundColor Yellow
    Write-Host "   Puedes verificar las instancias con: docker ps | Select-String ai-services" -ForegroundColor Yellow
} else {
    Write-Host "❌ Error al escalar los servicios" -ForegroundColor Red
    exit 1
}

