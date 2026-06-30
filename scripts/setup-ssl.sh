#!/bin/bash
# setup-ssl.sh
# Configura Let's Encrypt SSL para respicare.sytes.net y migra todos los
# archivos del proyecto de la URL del tunnel a https://respicare.sytes.net
#
# Uso: sudo bash setup-ssl.sh
# Credenciales No-IP embebidas (username + DDNS key)

set -euo pipefail

NOIP_USER="ewsf8jw"
NOIP_PASS="q2akLPZMUUZY"
DOMAIN="respicare.sytes.net"
PUBLIC_IP="38.250.158.226"
REPO="/root/respicare"
WEBROOT="/var/www/letsencrypt"

log() { echo "[$(date '+%H:%M:%S')] $*"; }


# ── 1. Actualizar DDNS ────────────────────────────────────────────────────────
log "Actualizando DDNS $DOMAIN → $PUBLIC_IP ..."
RESULT=$(curl -s --user "$NOIP_USER:$NOIP_PASS" \
    "https://dynupdate.no-ip.com/nic/update?hostname=$DOMAIN&myip=$PUBLIC_IP")
if [[ "$RESULT" == badauth* ]]; then
    echo "ERROR: Credenciales No-IP incorrectas ($RESULT)"
    exit 1
fi
log "DDNS actualizado: $RESULT"

# ── 2. Esperar que DNS propague ───────────────────────────────────────────────
log "Esperando propagación DNS (hasta 60s)..."
for i in $(seq 1 12); do
    RESOLVED=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null | head -1)
    if [ "$RESOLVED" = "$PUBLIC_IP" ]; then
        log "DNS resuelto: $DOMAIN → $RESOLVED"; break
    fi
    sleep 5
done
if [ "$RESOLVED" != "$PUBLIC_IP" ]; then
    log "ADVERTENCIA: DNS aún no propaga ($RESOLVED). Continuando de todas formas..."
fi

# ── 3. Preparar webroot para ACME challenge ───────────────────────────────────
log "Preparando webroot para ACME challenge..."
mkdir -p "$WEBROOT/.well-known/acme-challenge"

# Agregar volumen webroot a nginx y location ACME — solo si no existe ya
if ! grep -q "letsencrypt" "$REPO/nginx/nginx.vm.conf"; then
    sed -i '/location = \/nginx-health/i\
    # ACME challenge para Let'\''s Encrypt\
    location ^~ /.well-known/acme-challenge/ {\
        root /var/www/letsencrypt;\
        default_type text/plain;\
    }\
' "$REPO/nginx/nginx.vm.conf"
fi

# Agregar volumen letsencrypt webroot al nginx en docker-compose si no existe
if ! grep -q "letsencrypt" "$REPO/docker-compose.vm.yml"; then
    sed -i '/\.\/nginx\/nginx\.vm\.conf/a\      - /var/www/letsencrypt:/var/www/letsencrypt:ro' \
        "$REPO/docker-compose.vm.yml"
fi

# Recargar nginx con el nuevo volumen
cd "$REPO"
docker compose -f docker-compose.vm.yml up -d --force-recreate nginx
sleep 3
log "nginx recargado con webroot"

# ── 4. Obtener certificado SSL ────────────────────────────────────────────────
log "Solicitando certificado Let's Encrypt para $DOMAIN ..."
certbot certonly \
    --webroot \
    --webroot-path "$WEBROOT" \
    --domain "$DOMAIN" \
    --email "$NOIP_USER" \
    --agree-tos \
    --non-interactive \
    --no-eff-email
log "Certificado obtenido"

# ── 5. Actualizar nginx con bloque SSL ────────────────────────────────────────
log "Configurando nginx para HTTPS..."

# Montar certs en docker-compose
if ! grep -q "letsencrypt/live" "$REPO/docker-compose.vm.yml"; then
    sed -i '/\.\/nginx\/nginx\.vm\.conf/a\      - /etc/letsencrypt:/etc/letsencrypt:ro' \
        "$REPO/docker-compose.vm.yml"
fi

# Exponer puerto 443 en docker-compose
if ! grep -q '"443:443"' "$REPO/docker-compose.vm.yml"; then
    sed -i 's/"80:80"/"80:80"\n      - "443:443"/' "$REPO/docker-compose.vm.yml"
fi

# Reemplazar bloque server en nginx.vm.conf
CERT_PATH="/etc/letsencrypt/live/$DOMAIN"
cat >> "$REPO/nginx/nginx.vm.conf" << NGINXEOF

# ── HTTPS ──────────────────────────────────────────────────────────────────────
server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate     $CERT_PATH/fullchain.pem;
    ssl_certificate_key $CERT_PATH/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 10M;

    location /api/ {
        if (\$request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin      \$cors_origin;
            add_header Access-Control-Allow-Methods     'GET, POST, PUT, PATCH, DELETE, OPTIONS';
            add_header Access-Control-Allow-Headers     'Authorization, Content-Type, Accept';
            add_header Access-Control-Allow-Credentials 'true';
            add_header Content-Length 0;
            return 204;
        }
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        add_header Access-Control-Allow-Origin      \$cors_origin always;
        add_header Access-Control-Allow-Credentials 'true' always;
    }

    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        add_header Access-Control-Allow-Origin      \$cors_origin always;
        add_header Access-Control-Allow-Credentials 'true' always;
    }

    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        add_header Access-Control-Allow-Origin      \$cors_origin always;
        add_header Access-Control-Allow-Credentials 'true' always;
    }

    location /ai/ {
        if (\$request_method = OPTIONS) {
            add_header Access-Control-Allow-Origin      \$cors_origin;
            add_header Access-Control-Allow-Methods     'GET, POST, PUT, PATCH, DELETE, OPTIONS';
            add_header Access-Control-Allow-Headers     'Authorization, Content-Type, Accept';
            add_header Access-Control-Allow-Credentials 'true';
            add_header Content-Length 0;
            return 204;
        }
        proxy_pass http://ai_service/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Credentials;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        add_header Access-Control-Allow-Origin      \$cors_origin always;
        add_header Access-Control-Allow-Methods     'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header Access-Control-Allow-Headers     'Authorization, Content-Type, Accept' always;
        add_header Access-Control-Allow-Credentials 'true' always;
    }

    location /health {
        proxy_pass http://backend/health;
        proxy_set_header X-Forwarded-Proto https;
        add_header Access-Control-Allow-Origin \$cors_origin always;
        add_header Access-Control-Allow-Credentials 'true' always;
        access_log off;
    }

    location = /nginx-health {
        access_log off;
        return 200 "ok\n";
        add_header Content-Type text/plain;
    }

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
    }
}
NGINXEOF

# ── 6. Migrar todas las configs de tunnel → HTTPS permanente ─────────────────
log "Migrando configs del tunnel a https://$DOMAIN ..."
TUNNEL_DOMAIN=$(grep -v '^\s*#' "$REPO/.env" | grep -oP '[a-z0-9-]+\.trycloudflare\.com' | head -1 || echo "")

if [ -n "$TUNNEL_DOMAIN" ]; then
    for f in \
        "$REPO/.env" \
        "$REPO/.env.vm" \
        "$REPO/mobile/medical-app/.env.production" \
        "$REPO/mobile/medical-app/.env.staging" \
        "$REPO/mobile/medical-app/capacitor.config.ts" \
        "$REPO/nginx/nginx.vm.conf" \
        "$REPO/web/src/utils/apiBase.js"; do
        [ -f "$f" ] && sed -i "s|https://$TUNNEL_DOMAIN|https://$DOMAIN|g" "$f" && log "  ✓ $f"
    done
fi

# Actualizar CORS en .env (agregar https://respicare.sytes.net si no está)
if ! grep -q "https://$DOMAIN" "$REPO/.env"; then
    sed -i "s|CORS_ORIGINS=|CORS_ORIGINS=https://$DOMAIN,|" "$REPO/.env"
fi

# ── 7. Recargar todo ──────────────────────────────────────────────────────────
cd "$REPO"
docker compose -f docker-compose.vm.yml up -d --force-recreate nginx backend
sleep 5
log "Servicios reiniciados"

# ── 8. Configurar renovación automática ───────────────────────────────────────
log "Configurando renovación automática del certificado..."
systemctl enable --now certbot.timer
systemctl status certbot.timer --no-pager | head -5

# ── 9. Configurar noip-duc como servicio systemd ──────────────────────────────
log "Configurando noip-duc como servicio systemd..."
cat > /etc/systemd/system/noip-duc.service << EOF
[Unit]
Description=No-IP Dynamic Update Client
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/noip-duc --username $NOIP_USER --password $NOIP_PASS --hostnames $DOMAIN --ip-method http://api.ipify.org
Restart=always
RestartSec=300

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now noip-duc
log "noip-duc iniciado como servicio"

# ── 10. Deshabilitar tunnel (ya no se necesita) ───────────────────────────────
log "Deshabilitando tunnel Cloudflare (ya no necesario)..."
systemctl disable --now respicare-tunnel.service 2>/dev/null || true

# ── 11. Commit cambios ────────────────────────────────────────────────────────
git -C "$REPO" add \
    nginx/nginx.vm.conf \
    docker-compose.vm.yml \
    mobile/medical-app/.env.production \
    mobile/medical-app/.env.staging \
    mobile/medical-app/capacitor.config.ts \
    web/src/utils/apiBase.js \
    scripts/setup-ssl.sh 2>/dev/null || true

if ! git -C "$REPO" diff --cached --quiet 2>/dev/null; then
    git -C "$REPO" commit -m "feat(infra): migrate to permanent HTTPS via Let's Encrypt on respicare.sytes.net

- SSL cert from Let's Encrypt (auto-renews via certbot.timer)
- nginx now listens on 443 with TLS 1.2/1.3
- All app configs migrated from Cloudflare tunnel to https://respicare.sytes.net
- noip-duc running as systemd service for DDNS auto-update
- Cloudflare tunnel disabled (no longer needed)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
    git -C "$REPO" push origin fabian && log "Push a GitHub"
fi

log ""
log "=============================================="
log "  SSL CONFIGURADO EXITOSAMENTE"
log "  URL permanente: https://$DOMAIN"
log "  Certificado expira: $(certbot certificates 2>/dev/null | grep 'Expiry Date' | head -1)"
log "=============================================="
