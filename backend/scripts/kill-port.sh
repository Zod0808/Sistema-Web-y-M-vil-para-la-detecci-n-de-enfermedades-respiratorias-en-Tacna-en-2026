#!/bin/bash
# Script para detener procesos que usan un puerto específico
# Uso: ./scripts/kill-port.sh 3001

PORT=${1:-3001}

echo "Buscando procesos usando el puerto $PORT..."

# Detectar sistema operativo
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PIDS=$(lsof -ti:$PORT)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    PIDS=$(lsof -ti:$PORT)
else
    echo "Sistema operativo no soportado"
    exit 1
fi

if [ -z "$PIDS" ]; then
    echo "✓ No se encontraron procesos usando el puerto $PORT"
    exit 0
fi

echo "Encontrados procesos: $PIDS"

for PID in $PIDS; do
    PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null)
    if [ -n "$PROCESS_NAME" ]; then
        echo "Deteniendo proceso $PID ($PROCESS_NAME)..."
        kill -9 $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✓ Proceso $PID detenido"
        else
            echo "✗ Error deteniendo proceso $PID"
        fi
    fi
done

echo ""
echo "✓ Puertos liberados. Puedes iniciar el backend ahora."

