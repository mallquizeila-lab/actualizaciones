# Guía para Claude en este repositorio

Proyectos: **ShortForge** (raíz, `server.js`, `lib/`, `public/`, `viral/`) y **ProfeTok** (`aula/`). Detalles de ProfeTok en `PROFETOK.md`.
Cada actualización sube `VERSION` y agrega su nota arriba en `NOVEDADES.txt` (el actualizador del VPS depende de eso).

## Herramientas instaladas (revisadas con SkillSpector antes de instalar)

### 🗺️ Graphify — mapa del código
- Antes de preguntas de arquitectura («¿dónde se calcula X?», «¿qué toca Y?»), lee `graphify-out/GRAPH_REPORT.md`.
- Para consultas finas: `pip install graphifyy` y luego `graphify explain "nombreFuncion"` o `graphify path "A" "B"` (necesita `graphify update .` primero; sin IA y sin costo).
- Tras cambios grandes de código: `graphify update .` y commitear solo `GRAPH_REPORT.md`.

### 🎬 Lemo-Opuscar (plugin) — videos hechos con código
- Plugin de proyecto: estilos de película y render con Canvas/WebGL + ffmpeg, sin modelo de video. Úsalo para videos de ProfeTok/ShortForge.
- La primera vez descarga sus guías a `~/lemo-opuscar` y Chromium headless.

### ✂️ Ponytail — DESINSTALADO
- El usuario pidió quitarlo (no le gusta el panel de costos). No volver a instalarlo.

### 🛡️ SkillSpector (NVIDIA) — revisar plugins/skills antes de instalarlos
- `pip install git+https://github.com/NVIDIA/SkillSpector` y `skillspector scan <carpeta-del-skill> --no-llm`.
- Escanea solo las carpetas del skill/hooks (no el repo entero: tarda mucho). Un «SAFE» no garantiza nada: lee los hooks a mano.

### 🌐 Agent Reach — leer YouTube, Reddit, X, GitHub y más (solo lectura)
- Bajo demanda: `pipx install agent-reach` (o `pip install agent-reach`), `agent-reach doctor`, `agent-reach read <enlace>`.
- En la nube muchos sitios están bloqueados por la red; sirve más en el VPS. Nunca pedir contraseñas ni cookies al usuario por el chat.

## 🧰 Catálogo de IA de código abierto
- `IA_CODIGO_ABIERTO.md`: cada video, enlace o herramienta que manda el socio se analiza y sus IA de código abierto se anotan ahí (estrellas, licencia, para qué sirve, estado).
- Licencia AGPL/GPL o propia = solo ideas, no código. Nada se instala sin SkillSpector.

## 🎤 Voz para promociones de juegos (Yupitok)
- Para TODO video promocional de juegos usar la voz del usuario de `voces/promo_juegos_yupicards.mp3` (canción de Suno con música; `voces/promo_juegos_solo_voz.mp3` = solo voz separada). No usar voces de edge-tts en promos de juegos.
- Flujo: escribir el guion → el usuario genera la voz/canción en Suno con esa misma voz → yo corto las escenas en las pausas de la voz (silencedetect sobre la voz separada) y uso su audio completo como banda sonora.

## Reglas del usuario (no romper)
- Nunca pedir claves o tokens por el chat: van en sus paneles o en el formulario seguro.
- No poner su número de WhatsApp en el código. No enviar apellidos ni datos sensibles de alumnos a IAs (Ley 29733).
- Probar antes de publicar; cache-busting: subir `app.js?v=` / `estilos.css?v=` en `aula/public/index.html`.
