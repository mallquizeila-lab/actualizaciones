#!/usr/bin/env bash
# Actualiza Yupitok en el VPS cuando hay una versión nueva en GitHub (lo corre cron cada 30 minutos).
set -euo pipefail
REPO="mallquizeila-lab/actualizaciones"; BASE=/opt/yupitok
NUEVA=$(curl -fsSL -H "Accept: application/vnd.github.raw" "https://api.github.com/repos/$REPO/contents/VERSION?ref=main" | tr -d '[:space:]')
ACTUAL=$(tr -d '[:space:]' < "$BASE/VERSION" 2>/dev/null || echo "")
[ -n "$NUEVA" ] && [ "$NUEVA" != "$ACTUAL" ] || exit 0
echo "$(date) Actualizando $ACTUAL -> $NUEVA"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/main" | tar -xz -C "$TMP"
SRC=$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -1)
[ -f "$SRC/viral/server.js" ] || { echo "Descarga incompleta"; exit 1; }
cp -a "$SRC/viral/." "$BASE/app/"; cp "$SRC/VERSION" "$BASE/VERSION"; cp "$SRC/vps/actualizar.sh" "$BASE/actualizar.sh.nuevo" && mv "$BASE/actualizar.sh.nuevo" "$BASE/actualizar.sh" && chmod 755 "$BASE/actualizar.sh"
chown -R yupitok: "$BASE/app"
systemctl restart yupitok
echo "$(date) Listo: $NUEVA"
