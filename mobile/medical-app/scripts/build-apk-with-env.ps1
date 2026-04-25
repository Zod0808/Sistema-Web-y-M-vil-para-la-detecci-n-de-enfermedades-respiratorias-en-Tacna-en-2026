# Script para generar APK configurando ANDROID_HOME

$sdkPath = "C:\Users\User\AppData\Local\Android\Sdk"

if (-not (Test-Path $sdkPath)) {
    Write-Host "SDK no encontrado en: $sdkPath" -ForegroundColor Red
    Write-Host "Verifica la ruta o instala Android Studio" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configurando ANDROID_HOME: $sdkPath" -ForegroundColor Green
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath

Write-Host "Generando APK..." -ForegroundColor Cyan
Write-Host ""

cd android
.\gradlew.bat assembleDebug
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "APK generado exitosamente!" -ForegroundColor Green
    Write-Host "Ubicacion: android\app\build\outputs\apk\debug\app-debug.apk" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Error al generar APK" -ForegroundColor Red
    exit $exitCode
}
