# 🎮 YUPITOK: El Universo de las Aventuras
### Documento de diseño · Arquitectura · Plan de desarrollo (versión 1, 10/11/2026)

> **¡Juega, ríe, aprende y gana!**
> Yupi y sus amigos deben recuperar los **cristales mágicos** que robó **Gorgojo Grun** para apagar la luz del Reino de Yupitok.

---

## 1. Documento de diseño del videojuego (GDD)

### 1.1 Concepto
Aventura 3D de exploración para toda la familia que **se juega en el navegador** (celular, tablet y PC) dentro de yupitok.com, sin instalar nada. Mezcla:
- **Plataformas y exploración:** caminar, saltar, descubrir secretos.
- **Combate sencillo y estratégico:** salto sobre enemigos y, más adelante, cartas de habilidades.
- **Aprendizaje integrado:** los sabios del reino plantean preguntas que abren caminos y dan premios.

**Público:** todas las edades. Sin violencia gráfica: los enemigos "se desarman" en estrellitas y vuelven a ser bichitos simpáticos.

### 1.2 Historia
1. **Inicio:** Gorgojo Grun roba los 5 Cristales del Arcoíris del Castillo de Yupitok. El reino pierde su color.
2. **Cada mundo** guarda un cristal custodiado por un jefe.
3. **Final:** en la Fortaleza de Grun, Yupi y sus amigos recuperan el último cristal… y descubren que Grun solo quería que lo invitaran a jugar. Grun se vuelve aliado (personaje desbloqueable).

### 1.3 Personajes
| Personaje | Rol | Habilidad (diseño) | Estado |
|---|---|---|---|
| 👑 **Yupi** | Protagonista | Doble salto + **Giro de corona** (ataque en área) | ✅ Jugable en el prototipo |
| 🦙 **Lulú** | Exploradora | **Escupitajo de nubes**: alcanza botones lejanos | 🔒 Fase 2 |
| 🌽 **Choki** | Guerrero | **Lanzazo solar**: rompe muros dorados | 🔒 Fase 2 |
| 🥥 **Coquito** | Defensor | **Coraza**: resiste golpes, empuja rocas | 🔒 Fase 2 |
| 🌶️ **Rocoto Rojo** | Velocista | **Carrera picante**: cruza fuego y lava | 🔒 Fase 3 |
| 🦉 **Sabio Búho** | Maestro (NPC) | Da las **pruebas de conocimiento** | ✅ En el prototipo (NPC) |
| 🤖 **Robo Yuki** | Inventor | **Gancho magnético** | 🔒 Fase 3 |
| 🧚 **Hada Aprendiz** | Apoyo | **Curación** del equipo | 🔒 Fase 3 |
| ⭐ **Estrellín** | Guía | Muestra el camino a la misión | ✅ En el prototipo (guía flotante) |
| 🐢 **Tortugo** | Defensor | **Caparazón rodante** | 🔒 Fase 4 |
| 🐉 **Drakito Azul** | Explorador | **Vuelo corto** | 🔒 Fase 4 |
| 🪲 **Gorgojo Grun** | Villano / jefe final | — | Jefe en Fase 5 |

**Atributos por personaje:** Vida, Velocidad, Salto, Fuerza, Sabiduría. **Progresión:** experiencia → niveles 1 a 20 → mejoras de atributos y cosméticos (capas, coronas, colores).

### 1.4 Mundos
| # | Mundo | Ambiente | Enemigos | Jefe | Cristal |
|---|---|---|---|---|---|
| 1 | **Reino de Yupitok** | Pradera, castillo, islas flotantes | Gorgojitos, Babosas Saltarinas | Gorgojo Capitán | 💛 Amarillo |
| 2 | **Bosque Encantado** | Árboles gigantes, hongos de luz | Arañitas de hoja, Polillas | La Raíz Gruñona | 💚 Verde |
| 3 | **Imperio Dorado** | Ciudad inca de oro, terrazas | Estatuas despiertas | El Guardián del Sol | 🧡 Naranja |
| 4 | **Volcán de Fuego** | Lava, puentes, géiseres | Chispitas, Rocas rodantes | El Dragón de Magma | ❤️ Rojo |
| 5 | **Fortaleza de Grun** | Castillo morado mecánico | Robo-gorgojos | **Gorgojo Grun** | 💜 Morado |

Cada mundo: **3 niveles + 1 jefe**, 3 secretos, 1 prueba de conocimiento principal y monedas.

### 1.5 Mecánicas
- **Movimiento:** joystick táctil o WASD/flechas, salto (doble salto), cámara que se gira arrastrando.
- **Combate:** saltar encima del enemigo lo derrota; el "Giro de corona" golpea alrededor. Recibir golpe quita 1 corazón (3 corazones).
- **Misiones:** principales (historia) y secundarias (coleccionables, desafíos de tiempo).
- **Pruebas de conocimiento:** preguntas de matemáticas, ciencias, historia y geografía, lectura, lógica y valores. Acertar abre puertas y da monedas y experiencia. Fallar no castiga: explica la respuesta y deja reintentar.
- **Recolección:** 🪙 monedas, 💎 gemas (cosméticos), cristales (historia).
- **Sistema de cartas (Fase 3):** cada personaje tiene 3 cartas de habilidad. Se mejoran con gemas, conectado con GLORY BROWN.
- **Logros, trofeos y ranking** usando los sistemas actuales de Yupitok (Yupi Pass, Salón de la Fama).
- **Multijugador (Fase 5):** cooperativo de 2 jugadores, usando la tecnología de las Islas Portal.

### 1.6 Sistema educativo
- Banco de preguntas por **materia y nivel** (primaria, secundaria y general), con explicación de cada respuesta.
- **Integrado en la aventura:** el Sabio Búho custodia puentes; las estatuas del Imperio Dorado piden historia y geografía; los géiseres del volcán, ciencias.
- **Valores y convivencia:** misiones de ayudar a otros personajes (devolver objetos perdidos, compartir).

### 1.7 Economía
- **Gratis para jugar.** Nada que obligue a pagar ni dé ventajas injustas.
- 🪙 **Monedas** (se ganan jugando): cosméticos básicos y vidas extra.
- 💎 **Yupicoins** (la moneda de la plataforma): solo cosméticos (capas, coronas, colores).
- Las recompensas del juego **suman al Yupi Pass** y a las misiones diarias de Yupitok.

### 1.8 Estilo visual
3D "low-poly suave" con colores vivos, iluminación cálida y sombras, optimizado para celulares de gama media. Las animaciones (caminar, saltar, festejar) se hacen por código para que pesen poco. En fases futuras se reemplazan los personajes por modelos 3D más detallados (glTF) hechos a partir de las hojas de referencia de Flow.

---

## 2. Arquitectura técnica

```
Navegador (celular / PC)
 └─ yupitok.com (página, PWA)
     ├─ index.html ─ carga arcade.js ─ carga aventura.js (este juego)
     │                 └─ Three.js (motor 3D, MIT, ya incluido: /three.min.js)
     ├─ perfil.js  → progreso del jugador (monedas, XP, Yupi Pass, logros)
     └─ sonido.js  → música, efectos y voces
 Servidor de Yupitok (Node + SQLite)
     ├─ /api/perfil      → guardado seguro del progreso (cuentas y código)
     ├─ /api/yc/ganar    → Yupicoins y puntos del Yupi Pass (con topes antitrampa)
     └─ /api/arcade/puntaje → rankings y Salón de la Fama
```

**Principios:**
- **Rendimiento:** geometrías simples instanciadas, sombras solo del protagonista, límite de 60 fps y ajuste automático de resolución en celulares lentos.
- **Datos por niveles:** cada mundo es un objeto de configuración (terreno, objetos, enemigos, misiones, preguntas). Agregar un mundo nuevo es agregar datos, no reescribir el motor.
- **Guardado:** el progreso del juego vive en `PERFIL.datos.juegos.aventura` y se sincroniza con el servidor por la cuenta de Yupitok (ya existente).
- **Panel administrativo:** las preguntas educativas y los textos se pueden ampliar desde el banco de preguntas (Fase 2: editor en el panel).

## 3. Estructura de archivos
```
viral/public/
  aventura.js          ← motor del juego (prototipo, fase 1)
  three.min.js         ← motor 3D (ya existente)
  tests.json           ← registra el juego "arcade-aventura" en la portada
(fases siguientes)
  aventura/
    mundos/reino.js, bosque.js, dorado.js, volcan.js, fortaleza.js
    personajes/yupi.glb, lulu.glb, …   (modelos 3D finales)
    preguntas.json                      (banco educativo editable)
```

## 4. Diseño de interfaz
- **Pantalla de inicio:** logo "Yupitok · El Universo de las Aventuras", botón **▶ Jugar**.
- **Selección de personaje:** tarjetas de los 12 personajes. Yupi disponible; el resto con 🔒 y la fase en que llegan.
- **En el juego (HUD):** arriba a la izquierda ❤️❤️❤️ corazones, 🪙 monedas y misión actual. Arriba a la derecha 🔊 sonido y ⏸ pausa. Abajo a la izquierda joystick (táctil). Abajo a la derecha botones ⤒ saltar y 👑 giro.
- **Prueba de conocimiento:** ventana con la pregunta, 3 o 4 opciones grandes y la explicación al responder.
- **Fin de nivel:** resumen con monedas, tiempo, estrellas (1 a 3) y botón "Compartir mi récord".

## 5. Plan de desarrollo por fases
| Fase | Contenido | Estado |
|---|---|---|
| **1 · Prototipo** | Yupi jugable, Reino de Yupitok, movimiento, salto, interacción, 3 misiones, 2 enemigos, 1 prueba educativa, monedas, selección de personajes | ✅ **Entregado** |
| 2 · Equipo | Lulú, Choki y Coquito jugables (cambio de personaje en el nivel), 3 niveles del Reino + jefe, banco de 100 preguntas, editor de preguntas en el panel | Siguiente |
| 3 · Mundos 2 y 3 | Bosque Encantado e Imperio Dorado, cartas de habilidad, Rocoto Rojo, Robo Yuki y Hada | |
| 4 · Mundos 4 y 5 | Volcán de Fuego, Fortaleza de Grun, Tortugo, Drakito y jefe final | |
| 5 · Online | Cooperativo de 2 jugadores, eventos de temporada, modelos 3D finales (glTF) | |
