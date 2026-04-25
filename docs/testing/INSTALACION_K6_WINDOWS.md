# 📦 Instalación de K6 en Windows

Esta guía proporciona varias formas de instalar k6 en Windows, especialmente si tienes problemas con permisos de administrador.

## ⚠️ Problema Común

Si encuentras el error:
```
Acceso denegado a la ruta de acceso 'C:\ProgramData\chocolatey\.chocolatey'
```

Es porque Chocolatey requiere permisos de administrador.

---

## ✅ Solución 1: Ejecutar PowerShell como Administrador (Recomendado)

### Pasos:

1. **Cierra la terminal actual**

2. **Abre PowerShell como Administrador**:
   - Presiona `Win + X`
   - Selecciona "Windows PowerShell (Administrador)" o "Terminal (Administrador)"
   - O busca "PowerShell" en el menú inicio, haz clic derecho y selecciona "Ejecutar como administrador"

3. **Verifica que tienes permisos**:
   ```powershell
   # Deberías ver algo como "Administrador: Windows PowerShell" en la barra de título
   ```

4. **Instala k6 con Chocolatey**:
   ```powershell
   choco install k6
   ```

5. **Verifica la instalación**:
   ```powershell
   k6 version
   ```

---

## ✅ Solución 2: Instalación Manual (Sin Administrador)

Si no puedes usar permisos de administrador, puedes instalar k6 manualmente:

### Pasos:

1. **Descarga k6 desde GitHub**:
   - Ve a: https://github.com/grafana/k6/releases
   - Descarga la última versión para Windows (archivo `.zip`)
   - Ejemplo: `k6-v0.50.0-windows-amd64.zip`

2. **Extrae el archivo**:
   - Crea una carpeta en tu usuario: `C:\Users\TuUsuario\k6`
   - Extrae el contenido del ZIP ahí
   - Deberías tener: `k6.exe` en la carpeta

3. **Agrega k6 al PATH** (sin permisos de administrador):

   **Opción A: Usar variables de entorno de usuario**:
   
   - Presiona `Win + R`, escribe `sysdm.cpl` y presiona Enter
   - Ve a la pestaña "Opciones avanzadas"
   - Haz clic en "Variables de entorno"
   - En "Variables de usuario", selecciona "Path" y haz clic en "Editar"
   - Haz clic en "Nuevo" y agrega la ruta: `C:\Users\TuUsuario\k6`
   - Haz clic en "Aceptar" en todas las ventanas
   - **Cierra y vuelve a abrir** todas las terminales

   **Opción B: Usar PowerShell**:
   
   ```powershell
   # Obtener el PATH actual del usuario
   $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
   
   # Agregar la ruta de k6 (reemplaza con tu ruta real)
   $k6Path = "C:\Users\TuUsuario\k6"
   $newPath = "$currentPath;$k6Path"
   
   # Guardar el nuevo PATH
   [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
   
   # Verificar (debes cerrar y abrir la terminal)
   ```

4. **Verifica la instalación**:
   - **Cierra todas las terminales**
   - Abre una nueva terminal
   ```powershell
   k6 version
   ```

---

## ✅ Solución 3: Usar Scoop (Gestor de Paquetes Alternativo)

Scoop no requiere permisos de administrador para instalar paquetes en tu carpeta de usuario:

### Instalación de Scoop:

1. **Abre PowerShell** (puede ser normal, no necesita administrador):

   ```powershell
   # Cambiar política de ejecución (solo la primera vez)
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   
   # Instalar Scoop
   iwr -useb get.scoop.sh | iex
   ```

2. **Instala k6 con Scoop**:

   ```powershell
   scoop install k6
   ```

3. **Verifica la instalación**:

   ```powershell
   k6 version
   ```

---

## ✅ Solución 4: Usar Docker (Sin Instalar en Windows)

Si tienes Docker instalado, puedes usar k6 desde un contenedor:

### Ejecutar k6 en Docker:

```powershell
# En lugar de: k6 run script.js
# Usa:
docker run --rm -i grafana/k6 run - <script.js

# O con archivos locales:
docker run --rm -v ${PWD}:/scripts -w /scripts grafana/k6 run script.js
```

### Crear un alias para facilitar:

**PowerShell** (agregar al perfil):
```powershell
# Abrir perfil de PowerShell
notepad $PROFILE

# Agregar esta función:
function k6 {
    docker run --rm -v ${PWD}:/scripts -w /scripts grafana/k6 $args
}
```

---

## 🔧 Solución 5: Arreglar Chocolatey (Si tienes permisos)

Si tienes acceso de administrador pero Chocolatey tiene problemas:

1. **Ejecuta PowerShell como Administrador**

2. **Limpia los directorios problemáticos**:

   ```powershell
   # Eliminar directorios bloqueados
   Remove-Item "C:\ProgramData\chocolatey\lib\272b68445b82a7ddd0122f3b21632c5cb574a9cd" -Recurse -Force -ErrorAction SilentlyContinue
   
   # Limpiar cache
   choco cache remove --expired
   ```

3. **Reintenta la instalación**:

   ```powershell
   choco install k6 -y
   ```

---

## ✅ Verificación Final

Después de instalar con cualquiera de los métodos:

```powershell
# Verificar versión
k6 version

# Probar ejecución
k6 run --vus 1 --duration 1s https://httpbin.org/get
```

---

## 🐛 Troubleshooting

### Problema: "k6 no se reconoce como comando"

**Solución**:
- Cierra y vuelve a abrir todas las terminales
- Verifica que la ruta esté en el PATH:
  ```powershell
  $env:Path -split ';' | Select-String k6
  ```
- Si no aparece, agrega manualmente al PATH

### Problema: Error de permisos persistente

**Solución**:
- Usa la instalación manual (Solución 2) o Scoop (Solución 3)
- O usa Docker (Solución 4)

### Problema: Chocolatey sigue fallando

**Solución**:
- Verifica que tengas permisos de administrador reales
- Intenta con Scoop como alternativa
- O usa instalación manual

---

## 📚 Referencias

- [Documentación oficial de k6](https://k6.io/docs/)
- [Releases de k6 en GitHub](https://github.com/grafana/k6/releases)
- [Scoop - Gestor de paquetes para Windows](https://scoop.sh/)
- [Docker Hub - k6](https://hub.docker.com/r/grafana/k6)

---

**Última actualización**: Noviembre 2024

