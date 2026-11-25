# 🔎 Buscador de primeros clientes — ProfeTok

Herramienta de **investigación** para encontrar a los primeros docentes/colegios que podrían pagar ProfeTok, a partir de **señales públicas reales** (quejas, pedidos de ayuda, reseñas). Idea tomada del skill MIT `first-customer-finder`; reescrita en español y enfocada en el Perú.

**Regla de oro:** solo investiga y redacta. **Nunca envía mensajes ni contacta a nadie.** Eso lo decides tú, a mano.

**Dónde conviene correrla:** en tu **PC o el VPS con internet abierto**. En la nube de Claude muchos sitios (Facebook, foros) están bloqueados y los resultados salen pobres.

---

## Cómo se usa (con Claude en tu PC)

Pídele a Claude, en una sesión con internet:

> «Usa la guía de `buscador-clientes/` y búscame 10 posibles primeros clientes para ProfeTok (profetok.com). Modo estándar.»

Modos: **rápido** (5), **estándar** (10, por defecto), **profundo** (20 + patrones).

Al final, Claude escribe un JSON (ver abajo) y genera el reporte:
```bash
python3 buscador-clientes/generar_reporte.py analisis.json reporte.html
```

---

## Paso 1 — Entender el producto y el cliente ideal

ProfeTok resuelve el **papeleo del docente**: asistencia por voz, notas con una foto, registros automáticos. Antes de buscar, define:

- **Cliente ideal (principal):** docente de aula de colegio (inicial/primaria/secundaria) en Perú que llena registros, actas y asistencia a mano y se queja del tiempo que pierde.
- **Cliente adyacente:** director o subdirector que sufre la carga administrativa de su plana docente; academias y colegios privados chicos que deciden rápido la compra.
- **Descalificadores:** quien solo busca material gratis, quien no toca registros, cuentas institucionales sin poder de compra.

> Quien **usa** (docente) puede no ser quien **paga** (director/promotor del colegio privado). Para vender, prioriza el lado con decisión de compra.

## Paso 2 — Abrir los 5 «baldes» de búsqueda

Busca señales públicas en 5 ángulos. En cada una, quédate con publicaciones **recientes** y con un dolor claro:

1. **Pedido explícito:** «busco app para registro de asistencia», «algún sistema para las notas».
2. **Dolor:** «otra vez toda la noche llenando actas», «odio el registro auxiliar».
3. **Apaño:** «hago mi asistencia en Excel», «uso un cuaderno para las notas».
4. **Cambio:** «el SIAGIE me tiene harto», «deje tal app porque…».
5. **Momento:** inicio de año escolar, cierre de bimestre/trimestre, entrega de libretas.

**Dónde mirar (público, sin entrar con contraseña):**
- Grupos y páginas públicas de Facebook de docentes peruanos.
- Foros y comentarios de YouTube en videos de «cómo llenar el registro auxiliar / SIAGIE».
- TikTok de profes mostrando su papeleo.
- Comentarios en notas de prensa sobre carga administrativa docente.
- Grupos de WhatsApp/Telegram **públicos** (solo los abiertos).

## Paso 3 — Verificar antes de calificar (lo más importante)

**Abre la página original de cada señal.** Un resultado de buscador o un resumen NO es prueba. Confirma que existe, que dice lo que afirmamos y la fecha. Si no abre o no coincide, **se descarta**. Un prospecto con enlace muerto es peor que ninguno.

**Límites que no se cruzan:**
- Solo información pública que la persona compartió a propósito.
- Nunca pasar logins, muros de pago ni grupos privados.
- No comprar bases de datos ni buscar correos/teléfonos personales.
- **Ley 29733:** no guardar datos personales de docentes sin permiso. Nada de apellidos ni datos sensibles a ninguna IA.

## Paso 4 — Puntuar (0 a 100)

Cada prospecto verificado se puntúa en 5 dimensiones (0 a 5): **dolor, encaje, momento, alcanzable, evidencia**. Menos de 50, o sin una señal citada de dolor/pedido/momento, **no entra** en la lista corta. Diez buenos valen más que treinta genéricos.

> Nunca digas ni insinúes que el prospecto «está interesado» o «va a comprar». Siempre: «posible cliente según señales públicas».

## Paso 5 — Redactar el mensaje (NO enviarlo)

Para cada prospecto, sugiere el canal natural (responder en el hilo público, página de contacto del colegio) y un mensaje corto (menos de 90 palabras): menciona el contexto público, conéctalo con el problema exacto, describe ProfeTok en una frase y cierra con una pregunta fácil. Sin inventar cercanía ni datos personales.

**No** envíes mensajes, no comentes, no sigas, no llenes formularios. Si quieres enviar, es una decisión aparte y manual tuya.

## Paso 6 — Generar el reporte

Claude escribe el análisis como JSON y corre `generar_reporte.py`. El reporte sale en HTML (claro/oscuro, listo para imprimir).

---

## Esquema del JSON

```json
{
  "titulo": "Primeros clientes para ProfeTok",
  "producto": "ProfeTok",
  "producto_url": "https://profetok.com",
  "cliente_objetivo": "Docentes de aula en Perú",
  "alcance": "Fuentes públicas en español, últimos 12 meses",
  "generado_el": "2026-11-25",
  "modo": "estandar",
  "veredicto": "Un párrafo que dice dónde están las señales más fuertes y quién encabeza la lista.",
  "prospectos": [
    {
      "nombre": "Grupo 'Maestros del Perú' (señal de un miembro)",
      "tipo": "Comunidad docente",
      "etapa": "Consciente del problema",
      "score": 84,
      "senal": "Un docente pidió públicamente una app para no llenar el registro auxiliar a mano.",
      "evidencia": "Publicación pública reciente describiendo el problema en primera persona.",
      "por_que_encaja": "ProfeTok automatiza justo la asistencia y las notas que describe.",
      "por_que_ahora": "La publicación es de hace dos semanas y pide recomendaciones.",
      "fuente": {
        "titulo": "¿Alguna app para el registro auxiliar?",
        "url": "https://ejemplo.com/publicacion-publica",
        "tipo": "Publicación pública de Facebook",
        "fecha": "2026-11-10"
      },
      "canal": "Responder en el hilo público",
      "apertura": "Vi tu pregunta sobre el registro auxiliar...",
      "cuidado": "Confirma que siga llenándolo a mano antes de ofrecer.",
      "scores": { "dolor": 5, "encaje": 5, "momento": 4, "alcanzable": 4, "evidencia": 4 }
    }
  ],
  "patrones": [
    { "titulo": "Asistencia en papel", "cantidad": 4, "idea": "Muchos docentes siguen pasando lista en cuaderno y luego copiando al sistema." }
  ],
  "plan": {
    "angulo": "Ofrecer una prueba gratis de 15 días antes de pedir la compra.",
    "primer_paso": "Escribir a los 3 prospectos de mayor puntaje con una pregunta basada en su propia publicación.",
    "seguimiento": "Compartir el video de Libretín solo si confirman que el problema sigue.",
    "exito": "Tres conversaciones y un colegio probando ProfeTok en siete días."
  },
  "limites": [
    "Posibles clientes deducidos de señales públicas, no compradores confirmados.",
    "Verifica que cada señal siga vigente antes de escribir; todo contacto manual.",
    "Ley 29733: no guardar datos personales sin permiso."
  ]
}
```
