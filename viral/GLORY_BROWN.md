# 👑 GLORY BROWN — El Choque de los Reinos

Juego original de estrategia con cartas en tiempo real, en homenaje a la abuelita Glory Brown.
Corre dentro de la página viral: funciona en PC, Android y iPhone desde el navegador, sin instalar nada.

## Cómo se juega y se prueba
1. En ShortForge, enciende la **Página viral** (pestaña 📣).
2. Abre la página y toca **"👑 GLORY BROWN"** (o entra a `/?g=arcade-batalla`).
3. Voces: en ShortForge → 📣 Página viral → **"🎙️ Grabar las voces de los personajes"** (unas 983 frases, ~15 minutos con internet).
   Mientras no estén grabadas, el juego usa la voz del celular de cada jugador.

## Archivos
| Archivo | Qué hace |
|---|---|
| `herramientas/glory_cartas.py` | **Catálogo central**: 127 cartas, 7 mundos, 21 arenas, rarezas, estadísticas, habilidades, voces y frases. Para balancear, edita este archivo y ejecútalo (`python3 herramientas/glory_cartas.py`). |
| `public/glory/cartas.js` | Catálogo generado que usa el juego (no editar a mano). |
| `public/glory/frases.json` | Todas las frases de los personajes con su voz (lo usa ShortForge para grabarlas). |
| `public/glory/arte.js` | Arte vectorial propio de cada personaje según su tipo y su mundo, con caché de sprites. |
| `public/glory/reina_*.webp` | Imágenes originales de la Reina Glory Brown (presentación, carta y miniatura). |
| `public/batalla.js` | Interfaz (intro, batalla, colección, mundos, cofres, clanes), motor de combate, IA, red y recompensas. |
| `juego_online.js` | Servidor: cuentas, clanes con chat moderado y salas en línea 1 vs 1 y 2 vs 2. |
| `lib/viral.js` (ShortForge) | Grabación de voces con la biblioteca de ShortForge (Edge/Kokoro). |

## Contenido
- **127 cartas**: 90 tropas, 21 hechizos, 15 estructuras y la Reina Glory Brown (Legendaria Real).
- **7 mundos × 3 arenas = 21 arenas**, cada mundo con su escenario, río, puentes, decoración y partículas propias.
- **Rarezas**: Común, Rara, Épica, Legendaria, Mítica, Suprema y Legendaria Real.
- **Habilidades**: curación, escudo, aura de protección, carga, rugido (aturde), invisibilidad, asesino, veneno, quemadura, congelación, aturdimiento, rayo en cadena, robo de vida, explosión al morir, división, renacer, invocación, empuje y provocación.
- **Hechizos**: área, meteoro, congelar, rayo, línea, curación, veneno, furia, tornado, empuje, escudo, portal e drenar vida.
- **Reina Glory Brown**: Luz de Amor, Rayo Dorado, Escudo Real y Corazón de Abuelita; presentación especial y frase de homenaje.
- **Progreso**: trofeos, arenas, niveles de carta (1–10), fragmentos, monedas, cofres (madera, plata, oro, mágico, real), cofre gratis cada 4 h y cofre de coronas. Sin compras obligatorias ni apuestas.
- **Modos**: batalla en línea 1 vs 1, 2 vs 2 en línea, con un amigo (código), contra la máquina, 2 vs 2 con bots y campaña por las 21 arenas.
- **Social**: clanes con chat (solo texto y emojis, sin enlaces), retos de clan, emojis en batalla y cartas para compartir en redes.

## Estado por fases
- ✅ Fase 1 — Combate jugable (arena, torres, elixir, mazo de 8 y mano de 4, IA, victoria y derrota, sonido).
- ✅ Fase 2 — Catálogo de 127 cartas con datos estructurados, rarezas, habilidades, mundos y colección.
- 🟡 Fase 3 — Arte: personajes vectoriales propios y animados (2D). Los **modelos 3D** reales necesitan archivos GLB (por ejemplo, creados a partir de tus ilustraciones); el motor permite cambiar el arte sin tocar la lógica.
- ✅ Fase 4 — Mundos, campaña, cofres, menús, música y voces.
- ✅ Fase 5 — En línea: cuentas, emparejamiento, salas 1 vs 1 y 2 vs 2, clanes y ranking (mundial, por país y de clanes). **El servidor calcula cada partida** con el mismo motor (`public/glory/motor.js`): valida mazo, elixir, mano y lado del río, y todos juegan al nivel de torneo 9.
- 🟡 Fase 6 — App instalable desde el navegador en /glory (ícono de la Reina, pantalla completa). Falta publicarla en Play Store / App Store.
