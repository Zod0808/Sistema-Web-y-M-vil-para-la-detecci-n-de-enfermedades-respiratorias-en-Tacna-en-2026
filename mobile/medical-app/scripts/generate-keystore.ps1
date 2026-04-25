# ════════════════════════════════════════════════════════════════════
# generate-keystore.ps1
#
# Genera el keystore de firma para el APK de release de RespiCare.
# Ejecutar UNA SOLA VEZ y guardar el .keystore en lugar seguro.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts/generate-keystore.ps1
# ════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

$KEYSTORE_NAME  = "respicare-release.keystore"
$KEY_ALIAS      = "respicare"
$VALIDITY_DAYS  = 10000
$DNAME          = "CN=RespiCare Medical, OU=Mobile, O=RespiCare, L=Lima, ST=Lima, C=PE"
$ANDROID_DIR    = "$PSScriptRoot\..\android"
$KEYSTORE_PATH  = "$ANDROID_DIR\$KEYSTORE_NAME"
$PROPS_PATH     = "$ANDROID_DIR\keystore.properties"

Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  RespiCare — Generador de Keystore APK" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar que keytool esté disponible
$keytool = (Get-Command keytool -ErrorAction SilentlyContinue)?.Source
if (-not $keytool) {
    # Intentar desde JAVA_HOME
    $javaHome = $env:JAVA_HOME
    if ($javaHome) {
        $keytool = "$javaHome\bin\keytool.exe"
    }
    if (-not (Test-Path $keytool)) {
        Write-Host "ERROR: keytool no encontrado." -ForegroundColor Red
        Write-Host "Instala JDK 17+ y asegúrate de que JAVA_HOME esté configurado." -ForegroundColor Yellow
        exit 1
    }
}

# Evitar sobreescribir un keystore existente
if (Test-Path $KEYSTORE_PATH) {
    Write-Host "ADVERTENCIA: El keystore ya existe en:" -ForegroundColor Yellow
    Write-Host "  $KEYSTORE_PATH" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "¿Sobreescribir? (s/N)"
    if ($confirm -ne "s" -and $confirm -ne "S") {
        Write-Host "Cancelado." -ForegroundColor Gray
        exit 0
    }
}

# Solicitar contraseñas de forma segura
Write-Host "Ingresa las contraseñas para el keystore:" -ForegroundColor White
Write-Host "(Mínimo 6 caracteres. Guárdalas en un lugar seguro.)" -ForegroundColor Gray
Write-Host ""

$storePass = Read-Host "Store password" -AsSecureString
$storePassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePass)
)

$keyPass = Read-Host "Key password (Enter = igual que store password)" -AsSecureString
$keyPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPass)
)
if ([string]::IsNullOrEmpty($keyPassPlain)) {
    $keyPassPlain = $storePassPlain
}

Write-Host ""
Write-Host "Generando keystore..." -ForegroundColor Cyan

& $keytool -genkey -v `
    -keystore $KEYSTORE_PATH `
    -alias $KEY_ALIAS `
    -keyalg RSA -keysize 2048 `
    -validity $VALIDITY_DAYS `
    -dname $DNAME `
    -storepass $storePassPlain `
    -keypass $keyPassPlain

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al generar el keystore." -ForegroundColor Red
    exit 1
}

# Crear keystore.properties automáticamente
$propsContent = @"
# AUTO-GENERADO por generate-keystore.ps1 — NO COMMITEAR
storeFile=../$KEYSTORE_NAME
storePassword=$storePassPlain
keyAlias=$KEY_ALIAS
keyPassword=$keyPassPlain
"@

Set-Content -Path $PROPS_PATH -Value $propsContent -Encoding UTF8

Write-Host ""
Write-Host "✓ Keystore generado:" -ForegroundColor Green
Write-Host "  $KEYSTORE_PATH" -ForegroundColor White
Write-Host ""
Write-Host "✓ keystore.properties creado:" -ForegroundColor Green
Write-Host "  $PROPS_PATH" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANTE:" -ForegroundColor Yellow
Write-Host "  1. Guarda el archivo .keystore en lugar seguro (fuera del repo)." -ForegroundColor Yellow
Write-Host "  2. keystore.properties está en .gitignore — nunca lo commitees." -ForegroundColor Yellow
Write-Host "  3. Sin este keystore no podrás actualizar la app en Play Store." -ForegroundColor Yellow
Write-Host ""
Write-Host "Para generar el APK de release:" -ForegroundColor Cyan
Write-Host "  npm run android:release" -ForegroundColor White
Write-Host ""