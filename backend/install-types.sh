#!/bin/bash

# Script para instalar las dependencias de tipos faltantes
echo "Instalando dependencias de tipos faltantes..."

npm install --save-dev @types/hpp @types/xss-clean @types/swagger-ui-express

echo "Dependencias instaladas exitosamente!"
echo "Ahora puedes ejecutar: npm run dev"
