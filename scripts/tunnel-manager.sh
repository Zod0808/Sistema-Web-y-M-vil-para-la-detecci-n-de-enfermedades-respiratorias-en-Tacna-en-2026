#!/bin/bash
# tunnel-manager.sh
# Inicia el tunnel Cloudflare y actualiza automáticamente todos los archivos
# de configuración cuando la URL cambia (en cada reinicio del VM o del servicio).

set -uo pipefail

REPO="/root/respicare"
LOG="/var/log/respicare-tunnel.log"
URL_LOCK="/tmp/respicare_tunnel_url"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

update_configs() {
    local new_url="$1"
    local new_domain="${new_url#https://}"

    # Obtener dominio actual de los archivos
    local current_domain
    current_domain=$(grep -oP '[a-z0-9-]+\.trycloudflare\.com' "$REPO/.env" 2>/dev/null | head -1 || echo "")

    if [ "$new_domain" = "$current_domain" ]; then
        log "URL sin cambios ($new_url) — no se requiere actualización"
        return 0
    fi

    log "URL cambió: ${current_domain:-ninguna} → $new_domain"

    # Actualizar todos los archivos de configuración
    local files=(
        "$REPO/.env"
        "$REPO/.env.vm"
        "$REPO/mobile/medical-app/.env.production"
        "$REPO/mobile/medical-app/.env.staging"
        "$REPO/mobile/medical-app/capacitor.config.ts"
        "$REPO/nginx/nginx.vm.conf"
        "$REPO/web/src/utils/apiBase.js"
    )

    for f in "${files[@]}"; do
        if [ -f "$f" ] && [ -n "$current_domain" ]; then
            sed -i "s|$current_domain|$new_domain|g" "$f"
            log "  ✓ $f"
        fi
    done

    # Recargar nginx con nuevo CORS
    docker exec respicare-nginx nginx -s reload 2>/dev/null \
        && log "  ✓ nginx recargado" \
        || log "  ✗ nginx reload falló"

    # Recrear backend con nuevo CORS_ORIGINS
    cd "$REPO"
    docker compose -f docker-compose.vm.yml up -d --force-recreate backend 2>/dev/null \
        && log "  ✓ backend reiniciado con nuevo CORS" \
        || log "  ✗ backend restart falló"

    # Commit y push → dispara Vercel autodeploy
    # Nota: .env y .env.vm están en .gitignore (se actualizan en disco pero no en git)
    git -C "$REPO" add \
        mobile/medical-app/.env.production \
        mobile/medical-app/.env.staging \
        mobile/medical-app/capacitor.config.ts \
        nginx/nginx.vm.conf \
        web/src/utils/apiBase.js

    if ! git -C "$REPO" diff --cached --quiet; then
        git -C "$REPO" commit -m "chore: auto-update tunnel URL → $new_domain

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
        git -C "$REPO" push origin fabian \
            && log "  ✓ Push a GitHub — Vercel rebuild disparado" \
            || log "  ✗ Push falló"
    else
        log "  Sin cambios que commitear"
    fi

    log "Actualización completada. Tunnel activo: $new_url"
}

# ── Main ─────────────────────────────────────────────────────────────────────
mkdir -p "$(dirname "$LOG")"
rm -f "$URL_LOCK"

log "=== RespiCare Tunnel Manager iniciando ==="

# Matar instancias previas de cloudflared
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Iniciar cloudflared y procesar su salida en tiempo real
cloudflared tunnel --url http://localhost:80 --no-autoupdate 2>&1 | \
while IFS= read -r line; do
    # Guardar en log (sin saturar con líneas de heartbeat)
    [[ "$line" != *"Updating latency"* ]] && echo "[$(date '+%H:%M:%S')] $line" >> "$LOG"

    # Detectar URL del tunnel (solo la primera vez por sesión)
    if [[ "$line" =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]] && [ ! -f "$URL_LOCK" ]; then
        local_url="${BASH_REMATCH[1]}"
        echo "$local_url" > "$URL_LOCK"
        log "Tunnel URL detectada: $local_url"
        update_configs "$local_url"
    fi
done

log "cloudflared terminó — el servicio se reiniciará automáticamente"
