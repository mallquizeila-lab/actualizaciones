# 🧰 Catálogo de IA de código abierto (para ShortForge, ProfeTok y Yupitok)

Lo vamos llenando con cada video, enlace o herramienta que manda el socio. Datos revisados en GitHub el 24-11-2026.

**Licencias:** ✅ = podemos usar el código aunque vendamos el producto (MIT, Apache, BSD) · ⚠️ = solo la idea o con condiciones · ❌ = no usar.
**Estado:** 🟢 ya lo usamos · 🔵 listo para probar · ⚪ catalogado (falta evaluar).
**Regla de seguridad:** nada se instala sin pasar antes por SkillSpector y sin leer sus hooks a mano (ver `CLAUDE.md`).

## 🎬 Video con IA (editar, cortar, animar)

| Herramienta | ⭐ | Licencia | Qué hace | Dónde nos sirve | Estado |
|---|---|---|---|---|---|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | 89k | ✅ Apache-2.0 | HTML/CSS/JS → video MP4 exacto; edita y rehace videos | Anuncios animados (como el de Libretín) | ⚪ parecido a Lemo-Opuscar, que ya usamos |
| [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | 11k | ✅ MIT | 42 herramientas de edición: cortar silencios, subtítulos, vertical, nivelar audio | ShortForge: revisar si tiene algo que nos falte | ⚪ |
| [kurbaitaev/ghost-editor](https://github.com/kurbaitaev/ghost-editor) | 725 | ✅ MIT | Toma cruda hablando a cámara → reel terminado (mejores tomas, subtítulos que no tapan la cara, gráficos) | ShortForge: «Reeditar mis videos» | 🔵 |
| [AgriciDaniel/claude-shorts](https://github.com/AgriciDaniel/claude-shorts) | 504 | ✅ MIT | Video largo → shorts: nota de 5 criterios (gancho, coherencia, emoción, valor, remate), cortes en fin de frase, sigue el cursor | ShortForge: «Desarmar video» | 🔵 |
| [nexu-io/openmotion](https://github.com/nexu-io/openmotion) | 16k | ✅ Apache-2.0 | Video de referencia → animación editable (alternativa a CapCut) | «Hazme uno como este» | ⚪ |
| [howseen-ai/claude-motion-design](https://github.com/howseen-ai/claude-motion-design) | 894 | ✅ MIT | Motion design en código (HTML + Playwright + ffmpeg) | Anuncios | ⚪ |
| [kaomei/stickman-video-director](https://github.com/kaomei/stickman-video-director) | 8k | ✅ MIT | Guion → video animado con monigotes | Videos educativos para ProfeTok | ⚪ |
| [OpenMontageInc/OpenMontage](https://github.com/OpenMontageInc/OpenMontage) | 83k | ⚠️ AGPL-3.0 | Sistema completo de producción: video de referencia → 2-3 ideas, revisión tras el render, detector de «diapositivas», control de gastos | Solo **ideas** (copiar su código nos obligaría a publicar el nuestro) | ⚪ ideas anotadas |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 75k | ⚠️ propia | Videos con React | Gratis para personas y empresas chicas; para empresas grandes se paga | ⚪ |
| [Wan-Video/Wan2.2](https://github.com/Wan-Video/Wan2.2) | 19k | ✅ Apache-2.0 | Genera video con IA a partir de texto o imagen | Escenas para videos (necesita GPU potente) | ⚪ |
| [Lightricks/LTX-Video](https://github.com/Lightricks/LTX-Video) | 11k | ✅ Apache-2.0 | Genera video con IA, más liviano | Escenas cortas | ⚪ |

## 🎙️ Voz (narrar, clonar, transcribir)

| Herramienta | ⭐ | Licencia | Qué hace | Dónde nos sirve | Estado |
|---|---|---|---|---|---|
| [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) | 28k | ✅ MIT | Voz natural y clonación de voz (con permiso) | ShortForge «Mis voces» | 🟢 ya en ShortForge (`voz_clonada.py`) |
| [hexgrad/kokoro](https://github.com/hexgrad/kokoro) | 10k | ✅ Apache-2.0 | Voz rápida y liviana | ShortForge | 🟢 ya en ShortForge (`voz_local.py`) |
| [QwenLM/Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) | 15k | ✅ Apache-2.0 | Voz muy natural, varios idiomas | Narraciones más humanas (probar el español) | 🔵 |
| [jamiepine/voicebox](https://github.com/jamiepine/voicebox) | 61k | ✅ MIT | Estudio de voz: clonar, dictar, crear | Alternativa local a ElevenLabs | ⚪ |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | 27k | ✅ MIT | Pasa audio a texto con el tiempo de cada palabra | Subtítulos y analizar videos que nos manden | 🟢 ya en ShortForge (VPS) |
| [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 55k | ✅ MIT | Lo mismo, sin Python y en cualquier PC | Transcribir en el VPS sin instalar mucho | ⚪ |
| [facebookresearch/demucs](https://github.com/facebookresearch/demucs) | 10k | ✅ MIT | Separa voz y música | Limpiar audios de Suno | ⚪ (hoy usamos UVR) |

## 🖼️ Imagen

| Herramienta | ⭐ | Licencia | Qué hace | Dónde nos sirve | Estado |
|---|---|---|---|---|---|
| [black-forest-labs/flux](https://github.com/black-forest-labs/flux) | 26k | ✅ Apache-2.0 (modelo «schnell») | Genera imágenes | Fotos de las webs y miniaturas | 🟢 vía Cloudflare |
| [danielgatis/rembg](https://github.com/danielgatis/rembg) | 26k | ✅ MIT | Quita el fondo de una foto | Fotochecks de ProfeTok, personajes | 🔵 |
| [steveruizok/perfect-freehand](https://github.com/steveruizok/perfect-freehand) | 17k | ✅ MIT | Trazos de lápiz naturales (grosor variable por velocidad), como Excalidraw/Procreate. 4 KB, matemática pura | Pizarra Mágica de ProfeTok | 🟢 integrado (`aula/public/lib/perfect-freehand.js`) |
| [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | 38k | ✅ BSD-3 | Mejora la calidad o agranda imágenes | Fotos borrosas de alumnos o clientes | ⚪ |

## 🤖 Agentes y automatización

| Herramienta | ⭐ | Licencia | Qué hace | Dónde nos sirve | Estado |
|---|---|---|---|---|---|
| [carolinacherry/claude-first-customer-finder-skill](https://github.com/carolinacherry/claude-first-customer-finder-skill) | — | ✅ MIT | Skill: das la URL de tu negocio → busca posibles primeros clientes en señales públicas, los puntúa (0–100), redacta el mensaje (no lo envía) y arma un reporte HTML | Conseguir primeros clientes de **ProfeTok** (docentes). Revisado con SkillSpector: **SAFE/LOW**, sin hooks | 🟢 idea adaptada a `buscador-clientes/` (ES, Perú) |
| [diwennee/openreply](https://github.com/diwennee/openreply) | 3.5k | ✅ MIT | Alternativa libre a ManyChat: alguien comenta una palabra clave → mensaje privado automático | «Comenta PROFE y te mando…» en Facebook/Instagram | 🔵 prioridad |
| [zernio-dev/zernflow](https://github.com/zernio-dev/zernflow) | 252 | ✅ MIT | Chatbots visuales para Instagram, Facebook y Telegram | Lo mismo, más completo | ⚪ |
| [Jakeschincariol/youtube-agent-skill](https://github.com/Jakeschincariol/youtube-agent-skill) | 7k | ✅ MIT | 11 skills para manejar un canal de YouTube (21 fórmulas de gancho con puntaje) | Mejorar los guiones de ShortForge | 🔵 |
| [openclaw/openclaw](https://github.com/openclaw/openclaw) | 395k | ✅ MIT | Asistente de IA que actúa en tu PC y en WhatsApp | ⚠️ El video lo usa para manejar anuncios de Meta con un token: riesgo de que te gasten la tarjeta | ⚪ evaluar con cuidado |
| [ollama/ollama](https://github.com/ollama/ollama) | 188k | ✅ MIT | Corre modelos de IA en tu propia PC, gratis | IA sin costo por uso en el VPS (si alcanza la memoria) | ⚪ |

## 🛡️ Seguridad

| Herramienta | ⭐ | Licencia | Qué hace | Estado |
|---|---|---|---|---|
| [NVIDIA/SkillSpector](https://github.com/NVIDIA/SkillSpector) | 28k | ✅ Apache-2.0 | Revisa skills y plugins antes de instalarlos | 🟢 lo usamos |

## 💡 Ideas sacadas de los videos que mandó el socio

- ✅ **Revisión automática tras cada render** (negros, congelados, audio) — de OpenMontage. **Hecho en 9.53.0** (`lib/revisarvideo.js`, código propio).
- ✅ **Detector de «video tipo diapositivas»** — de OpenMontage. **Hecho en 9.54.0** (ritmo en `lib/revisarvideo.js`).
- ✅ **«Hazme uno como este»** con un archivo de referencia → 3 ideas (qué se conserva y qué cambia) — de OpenMontage/openmotion. **Hecho en 9.54.0** (Desarmar video).
- ✅ **Palabra clave en comentarios → mensaje privado automático** — de openreply y de los reels. **Hecho en 9.54.0** (código propio, `lib/comments.js`).
- ✅ **Buscador de primeros clientes** (URL del negocio → prospectos con señal pública, puntaje y reporte HTML) — de `first-customer-finder` (MIT). **Adaptado en `buscador-clientes/`** (español, enfocado en docentes peruanos de ProfeTok; reutiliza su generador de reportes MIT). Se corre en la PC/VPS con internet abierto; en la nube los sitios están bloqueados.
- **Recrear el video ganador cada semana** — de los reels de «Claude publica, mide, aprende y recrea».
- **Formatos de anuncio:** sketch humano vs. mascota (profe vs. Libretín), «3 pasos» con tarjetas limpias, contador «0/5 → 5/5», cierre «Comenta PALABRA».
