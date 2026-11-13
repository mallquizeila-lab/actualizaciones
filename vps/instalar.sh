#!/usr/bin/env bash
# ☁️ Instalador de Yupitok (la Página viral) en un VPS con Ubuntu o Debian.
# Uso (lo copias desde ShortForge → Página viral → "Mudar la página a mi VPS"):
#   curl -fsSL https://raw.githubusercontent.com/mallquizeila-lab/actualizaciones/main/vps/instalar.sh | sudo bash -s -- "ENLACE_DE_MUDANZA"
# Qué hace: instala Node.js 22, descarga Yupitok, trae tus datos desde tu PC (enlace secreto de un solo uso),
# deja la página como servicio que se reinicia sola, conecta tu túnel de Cloudflare (mismo dominio) y se actualiza sola.
set -euo pipefail
PAQ="${1:-}"
REPO="mallquizeila-lab/actualizaciones"
BASE=/opt/yupitok
verde() { printf '\033[1;32m%s\033[0m\n' "$*"; }
rojo() { printf '\033[1;31m%s\033[0m\n' "$*"; }

[ "$(id -u)" = 0 ] || { rojo "Ejecútalo con sudo (o como root)."; exit 1; }
. /etc/os-release 2>/dev/null || true
case "${ID:-}${ID_LIKE:-}" in *ubuntu*|*debian*) ;; *) rojo "Este instalador es para Ubuntu o Debian (tu sistema: ${PRETTY_NAME:-desconocido})."; exit 1;; esac

verde "1/7 Instalando lo básico…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >/dev/null
apt-get install -y curl ca-certificates tar gzip gnupg cron >/dev/null

verde "2/7 Instalando Node.js 22…"
if ! node -v 2>/dev/null | grep -Eq '^v(2[2-9]|[3-9][0-9])\.'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y nodejs >/dev/null
fi
node -v

verde "3/7 Descargando Yupitok…"
id yupitok >/dev/null 2>&1 || useradd -r -d "$BASE" -s /usr/sbin/nologin yupitok
mkdir -p "$BASE/app" "$BASE/datos"
TMP=$(mktemp -d)
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/main" | tar -xz -C "$TMP"
SRC=$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)
cp -a "$SRC/viral/." "$BASE/app/"
cp "$SRC/VERSION" "$BASE/VERSION"
cp "$SRC/vps/actualizar.sh" "$BASE/actualizar.sh"; chmod 755 "$BASE/actualizar.sh"
rm -rf "$TMP"

verde "4/7 Trayendo tus datos desde tu PC…"
if [ -n "$PAQ" ]; then
  curl -fSL --retry 3 "$PAQ" -o "$BASE/mudanza.tgz" || { rojo "No pude descargar el paquete. Revisa que tu PC y ShortForge estén prendidos y genera un enlace nuevo."; exit 1; }
  rm -rf "$BASE/m"; mkdir -p "$BASE/m"; tar -xzf "$BASE/mudanza.tgz" -C "$BASE/m"
  [ -d "$BASE/m/viral" ] && cp -a "$BASE/m/viral/." "$BASE/datos/"
  rm -rf "$BASE/datos/_mudanza"
  grep -v '^TUNNEL_TOKEN=' "$BASE/m/config.env" > "$BASE/config.env"
  grep '^TUNNEL_TOKEN=' "$BASE/m/config.env" | cut -d= -f2- > "$BASE/tunel.token" || true
  rm -rf "$BASE/m" "$BASE/mudanza.tgz"
fi
[ -f "$BASE/config.env" ] || { rojo "Falta el enlace de mudanza. Cópialo completo desde ShortForge."; exit 1; }
chmod 600 "$BASE/config.env"; [ -f "$BASE/tunel.token" ] && chmod 600 "$BASE/tunel.token"
chown -R yupitok: "$BASE/app" "$BASE/datos" "$BASE/config.env"

verde "5/7 Dejando la página como servicio (se reinicia sola)…"
cat > /etc/systemd/system/yupitok.service <<EOF
[Unit]
Description=Yupitok - Pagina viral
After=network-online.target
Wants=network-online.target

[Service]
User=yupitok
WorkingDirectory=$BASE/app
EnvironmentFile=$BASE/config.env
Environment=PORT=3300
Environment=VIRAL_DATA=$BASE/datos
Environment=DONDE=vps
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable yupitok >/dev/null 2>&1
systemctl restart yupitok
for i in $(seq 1 40); do curl -fs http://127.0.0.1:3300/api/donde >/dev/null 2>&1 && break; sleep 1; done
curl -fs http://127.0.0.1:3300/api/donde >/dev/null || { rojo "La página no arrancó. Mira el error con: journalctl -u yupitok -n 50"; exit 1; }

verde "6/7 Conectando tu dominio (túnel de Cloudflare)…"
if [ -s "$BASE/tunel.token" ]; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    ARCH=$(dpkg --print-architecture); curl -fsSL -o /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-$ARCH.deb"; dpkg -i /tmp/cloudflared.deb >/dev/null; rm -f /tmp/cloudflared.deb
  fi
  cloudflared service uninstall >/dev/null 2>&1 || true
  cloudflared service install "$(cat "$BASE/tunel.token")" >/dev/null 2>&1
  systemctl enable --now cloudflared >/dev/null 2>&1 || true
else
  rojo "No vino el token del túnel: la página funciona en el VPS, pero tu dominio aún no apunta aquí."
fi

verde "7/7 Actualizaciones automáticas (cada 30 minutos)…"
echo "*/30 * * * * root $BASE/actualizar.sh >> /var/log/yupitok-actualizar.log 2>&1" > /etc/cron.d/yupitok
systemctl enable --now cron >/dev/null 2>&1 || true

echo
verde "✅ ¡LISTO! Yupitok ya corre en este VPS (versión $(cat $BASE/VERSION))."
echo "   Ahora vuelve a ShortForge y pulsa \"✅ El VPS ya está listo\" para apagar la página en tu PC."
echo "   Comandos útiles:  systemctl status yupitok   ·   journalctl -u yupitok -f   ·   $BASE/actualizar.sh"
