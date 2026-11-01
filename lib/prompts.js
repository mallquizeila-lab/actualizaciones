// Instrucciones para la IA: temas, guion + SEO, verificación de datos y el chatbot.

// Formatos que se van rotando para que los videos no se vean producidos en serie.
const FORMATS = [
  'dato sorprendente explicado', 'mito contra realidad', 'top 3 rápido', 'historia corta con giro final',
  'pregunta y respuesta', 'error común y cómo evitarlo', '¿qué pasaría si…?', 'antes y después',
];

const SENSITIVE = /salud|remedio|medic|finanz|dinero|ahorro|invers|legal|nutri/i;

function rules(ch) {
  let r = `REGLAS DE CALIDAD:
- No inventes estadísticas, estudios, citas, fechas ni cifras. Si no estás seguro de un dato, no lo uses.
- Español latinoamericano neutro, frases cortas, tono ${ch.tone || 'cercano y entusiasta'}.
- Nada de contenido engañoso, clickbait falso ni promesas que el video no cumple.`;
  if ((ch.manual || []).length) r += `
MANUAL DEL CANAL (lecciones aprendidas al analizar los videos anteriores; aplícalas):
${ch.manual.map(m => '- ' + m.t).join('\n')}`;
  if (SENSITIVE.test(ch.niche)) r += `
- Tema sensible (salud/finanzas/legal): informa en general, sin diagnósticos, sin asesoría personalizada y sin promesas.`;
  if (/salud|remedio|nutri/i.test(ch.niche)) r += `
- SALUD: nunca digas que algo "cura", "elimina" o "reemplaza" un tratamiento. Usa "puede ayudar", "es rico en", "se ha usado tradicionalmente".
- Incluye una advertencia real cuando exista (alergias, embarazo, medicamentos, cantidades) y recomienda consultar a un médico.
- Solo afirmaciones respaldadas por consenso científico general.`;
  if (/finanz|dinero|ahorro|invers/i.test(ch.niche)) r += `
- FINANZAS: nada de "hazte rico rápido" ni recomendaciones de comprar activos concretos.`;
  return r;
}

function charLine(ch) {
  const cs = (ch.characters || []).filter(c => c.closed);
  return ch.style === 'personaje' && cs.length ? cs.map(c => c.name).join(', ') : '';
}

const topicsP = (ch, k, used) => [{ role: 'user', content:
`Eres estratega de Shorts, TikTok y Reels virales para Latinoamérica.
Canal: "${ch.name}". Nicho: ${ch.niche}. ${ch.notes ? 'Notas del dueño: ' + ch.notes : ''}
${charLine(ch) ? `Los videos los narra en primera persona uno de estos personajes: ${charLine(ch)}. Cada tema debe estar protagonizado por UNO de ellos.` : ''}
Hoy es ${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}. Si se acerca una fecha o temporada relevante en Latinoamérica (frío y gripe, calor, Navidad, Día de la Madre, vuelta a clases, Semana Santa...), incluye 1 o 2 temas para aprovecharla.
${(ch.insights || []).length ? 'LO QUE FUNCIONA EN ESTE NICHO (investigación de la competencia y de tus estadísticas):\n' + ch.insights.map(x => '- ' + x).join('\n') : ''}
${(ch.tendencias || []).length ? 'TEMAS EN TENDENCIA ESTA SEMANA EN EL NICHO (inspírate, sin copiar): ' + ch.tendencias.slice(0, 8).join(' | ') : ''}
Propón ${k} temas distintos para videos de ${lenOf(ch).seg} segundos. Cada uno: UN solo tema concreto con suficiente fondo para desarrollarlo de principio a fin (ej. una receta casera completa, un mito explicado a fondo), que genere curiosidad y se explique con datos reales y conocidos.
Varía el formato entre: ${FORMATS.join('; ')}.
${used.length ? 'NO repitas ni parafrasees estos temas ya usados: ' + used.slice(-60).join(' | ') : ''}
Devuelve SOLO JSON: {"topics":[{"topic":"...","format":"uno de los formatos","character":"${charLine(ch) ? 'nombre exacto del personaje' : ''}"}]}` }];

// Duración del video por canal (Canales -> Editar -> Duración).
const LENGTHS = {
  viral: { seg: '25 a 45', pal: '70 a 110', esc: '6 a 9', txt: '8 a 16' },
  corto: { seg: '45 a 55', pal: '120 a 150', esc: '5 a 7', txt: '10 a 25' },
  medio: { seg: '60 a 80', pal: '160 a 210', esc: '6 a 8', txt: '18 a 32' },
  largo: { seg: '80 a 110', pal: '210 a 280', esc: '7 a 10', txt: '20 a 35' },
};
const lenOf = ch => LENGTHS[ch.length] || LENGTHS.medio;

// Bloque común de guion: escenas, CTAs repartidos, imágenes IA y SEO (ideas de promptClonar.js).
function scriptRules(ch, char, chars) {
  const multi = chars.length > 1;
  const L = lenOf(ch);
  return `ESTRUCTURA (${L.seg} segundos; la voz lee unas 2.5 palabras por segundo):
- Escena 1: gancho de máximo 12 palabras que obligue a seguir viendo (sin saludos).
- ${L.esc} escenas más. Total ${L.pal} palabras. Cada escena es UNA imagen fija.
UN SOLO TEMA, BIEN DESARROLLADO (lo más importante):
- Todo el video habla SOLO del tema indicado, de principio a fin. Prohibido saltar a otros datos, otras frutas u otros consejos.
- Cuenta una historia con hilo: gancho -> problema o curiosidad -> explicación paso a paso (por qué funciona, ingredientes, cómo se prepara o se usa, cuánto, cuándo) -> precaución o truco extra -> cierre que remate la idea.
- Cada escena continúa la anterior: usa conectores ("y por eso…", "pero ojo…", "ahora viene lo mejor…") para que se sienta una sola conversación, no una lista de frases sueltas.
- Profundiza: es mejor explicar bien UNA cosa con detalles útiles que mencionar muchas por encima.
PENSADO EN IMÁGENES: cada escena es UNA idea que se puede MOSTRAR en una sola imagen (un ingrediente, una acción, un resultado). Si una frase tiene dos ideas visuales, divídela en dos escenas.
FINAL EN BUCLE: la última escena debe conectar de forma natural con la primera frase (que al repetirse el video se sienta continuo), para que la gente lo vuelva a ver.
RETENCIÓN: en el primer segundo muestra o promete el resultado; cada 2 o 3 escenas agrega un pequeño giro o dato nuevo ("pero lo mejor viene ahora…").
- CTAs REPARTIDOS: 2 invitaciones a interactuar durante el video (hacia el 40% y el 70%), nunca en las 2 primeras escenas ni seguidas. La narración de esa escena DICE la frase de forma natural y humana (ej. "¿Tú qué harías?", "Comenta de qué país nos ves", "Guárdalo para después"). Varía el tipo.
- NO pongas despedida ni "suscríbete" al final: el sistema añade un cierre automático.
- "comment_question": pregunta corta para el cierre que invite a responder en comentarios.
${char ? `- NARRADOR: ${multi ? `personajes disponibles: ${chars.join(', ')}. Pueden conversar entre 1 y 2 de ellos; "speaker" indica quién habla en cada escena. Si conversan, es un DIÁLOGO REAL sobre el mismo tema: uno pregunta o duda y el otro responde, se interrumpen, reaccionan a lo que dijo el otro y llegan juntos a la conclusión.` : `el personaje "${char}" habla en primera persona.`} Personalidad simpática, como los videos virales de frutas que hablan.` : ''}
${rules(ch)}
IMÁGENES ("prompt_imagen", en INGLÉS, 20 a 40 palabras): sujeto, acción congelada, lugar, luz y encuadre. Sin texto, letras ni logos. ${char ? ((ch.look || 'escena') === 'escena' ? 'Describe la ESCENA con el personaje que habla haciendo una acción expresiva y graciosa (señalando, riendo, sorprendido, enojado, corriendo, con lentes, levantando pesas...) en un escenario concreto; si es diálogo, el otro personaje reacciona. Nombra a cada personaje por su fruta en inglés (lemon, garlic...). Varía los encuadres.' : 'Describe SOLO el fondo/escenario, sin personajes (el personaje se pone encima).') : 'Varía los encuadres (general, medio, detalle).'} Para personas usa "adult" y ropa completa; nunca palabras de cuerpo expuesto.
"img": 3 a 5 palabras en inglés para buscar una foto de stock parecida (respaldo).
"sfx": efecto de sonido opcional para la escena (whoosh, golpe, latido, ding, pop, suspenso) o vacío.
VOCES ("voces"): elige un tipo de voz para el narrador y para cada personaje según el TONO del video y la personalidad: ${require('./voces').PRESETS.map(p => p.id + ' (' + p.nombre + ')').join(', ')}.
  Comedia o personajes de dibujos -> graciosos (fruta, ardilla, gruñon, gigante, villano, chismosa); misterio o historia -> misterio o epico; salud y consejos -> adultos naturales, mama, abuelo o abuela; contenido infantil -> nino o nina. En diálogos, que las voces se distingan bien entre sí.
SEO para Latinoamérica: no inventes volúmenes de búsqueda.`;
}

const SCHEMA = (char, lenOf_txt = '10 a 25') => `Devuelve SOLO JSON:
{"title":"título interno",
"scenes":[{"text":"narración de ${lenOf_txt} palabras",${char ? '"speaker":"nombre exacto del personaje que habla",' : ''}"prompt_imagen":"...","img":"...","sfx":""}],
"ctas":[{"scene":4,"text":"texto en pantalla, máx 6 palabras"}],
"comment_question":"...",
"voces":{"narrador":"tipo de voz","Nombre exacto de cada personaje que habla":"tipo de voz"},
"hook":"texto grande en pantalla los primeros 3 segundos, máx 6 palabras, que genere curiosidad",
"thumbnail_text":"máx 4 palabras impactantes",
"seo":{
 "youtube":{"title":"máx 60 caracteres, palabra clave al inicio, curiosidad sin engañar","alt_titles":["otra","otra","otra"],"description":"3 a 5 frases; palabra clave en la primera línea","tags":["15 a 20 frases de 2 a 4 palabras que la gente escribe en el buscador; la primera = palabra clave principal; sin tecnicismos"],"keywords":["principal","5 a 8 secundarias y long-tail"],"hashtags":["#Shorts","3 a 5 más"],"pinned_comment":"comentario fijado que provoque respuestas","localizations":{"en":{"title":"título en inglés","description":"descripción en inglés"},"pt":{"title":"título en portugués","description":"descripción en portugués"}},"serie":"nombre corto de la serie o categoría del canal a la que pertenece (ej. Remedios de la abuela)"},
 "tiktok":{"caption":"máx 150 caracteres con gancho","hashtags":["4 a 6"]},
 "facebook":{"caption":"2 o 3 frases que inviten a comentar y compartir","hashtags":["3 a 5"]}
}}`;

const charsOf = ch => (charLine(ch) ? charLine(ch).split(', ') : []);

const scriptP = (ch, t) => {
  const chars = charsOf(ch), char = chars.length ? (t.character && chars.includes(t.character) ? t.character : chars[0]) : '';
  return [{ role: 'user', content:
`Escribe el guion de un video vertical (YouTube Shorts, TikTok y Reels).
Canal: "${ch.name}". Nicho: ${ch.niche}.
Tema: ${t.topic}
Formato: ${t.format || 'libre'}
${scriptRules(ch, char, chars)}
${SCHEMA(char, lenOf(ch).txt)}` }];
};

// "Inspirarse en un viral": copia la TÉCNICA (gancho, ritmo, giros, CTAs), nunca el contenido.
const inspireP = (ch, transcript, notes) => {
  const chars = charsOf(ch), char = chars[0] || '';
  return [{ role: 'user', content:
`Eres analista de videos virales y guionista. Te paso la transcripción de un video viral que funciona.
Canal: "${ch.name}". Nicho: ${ch.niche}.
${notes ? 'Indicaciones del dueño: ' + notes : ''}
TRANSCRIPCIÓN DEL VIRAL:
${String(transcript).slice(0, 8000)}

1. Analiza por qué funciona: gancho de los primeros 3 segundos, estructura, ritmo, giros, técnicas de retención y CTAs.
2. Crea un video NUEVO para este canal que use esa misma TÉCNICA, pero con OTRO tema o un ángulo claramente distinto.
   Prohibido copiar frases, la historia o el orden de ideas del original: el resultado debe ser contenido 100% original.
3. Mejora lo débil del original (gancho flojo, relleno, cierre débil, datos dudosos).
${scriptRules(ch, char, chars)}
Además del JSON indicado, agrega dos campos: "topic" (el tema nuevo, en una frase) y "analysis" (máximo 8 líneas: qué técnica tomaste y qué mejoraste).
${SCHEMA(char, lenOf(ch).txt)}` }];
};

// "Reeditar mis videos": el usuario ya tiene el video (hecho por él con otra IA). Se mejora el empaque:
// gancho, CTAs en el momento justo, SEO, y opcionalmente un guion nuevo para voz nueva.
// La IA "mira" fotogramas del video para saber de qué trata (aunque no tenga narración).
const visionP = (ch, frames) => [{ role: 'user', content: [
  { type: 'text', text: `Estos son ${frames.length} fotogramas en orden de un video corto. Canal: "${ch.name}" (nicho: ${ch.niche}).
Describe con precisión lo que se ve: personajes (qué son, cómo se ven), lugar, acciones y de qué parece tratar la historia o el consejo.
En "personajes" pon a los que hablan o podrían hablar (animales, frutas, personas, objetos con cara; máx 5), con "foto" = número del fotograma (1 a N) donde mejor se ve su cara.
Di si el video encaja con el nicho del canal.
Fíjate también si el video trae SUBTÍTULOS o texto de narración quemado en la imagen (no cuentes logos ni marcas de agua pequeñas). Si lo trae, indica la franja vertical que ocupa en el cuadro, en porcentaje de la altura (0 = arriba, 100 = abajo), tomando la zona más amplia en la que aparece.
Devuelve SOLO JSON: {"descripcion":"3 a 5 frases concretas","tema":"de qué trata, en una frase","personajes":[{"nombre":"nombre corto y simpático","descripcion":"cómo se ve en 6 a 12 palabras","foto":1,"genero":"M|F","puede_hablar":true}],"encaja_con_canal":true,"motivo":"si no encaja, por qué","subtitulos_quemados":false,"zona_subtitulos":{"arriba":0,"abajo":0}}` },
  ...frames.map(b64 => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b64 } })),
] }];

const reeditP = (ch, tr, dur, mode, cortar) => [{ role: 'user', content:
`Eres editor y estratega de Shorts/TikTok/Reels. Te paso la transcripción con tiempos de un video PROPIO del canal "${ch.name}" (nicho: ${ch.niche}). Duración: ${dur.toFixed(1)} s.
${tr?.visual ? 'LO QUE SE VE EN EL VIDEO (fuente principal si no hay narración; el título y el gancho DEBEN coincidir con esto): ' + tr.visual + '\n' : ''}${tr && tr.frases?.length ? 'TRANSCRIPCIÓN:\n' + tr.frases.map(f => `[${f.inicio.toFixed(1)}-${f.fin.toFixed(1)}] ${f.texto}`).join('\n').slice(0, 9000) : 'El video no tiene narración transcrita.' + (tr?.visual ? '' : ' Título del archivo: ' + (tr?.nombre || 'sin nombre') + '. Si el nombre no dice nada útil, usa títulos genéricos del nicho sin inventar detalles concretos.')}
PROHIBIDO inventar: el título, el gancho y la narración deben hablar SOLO de lo que se ve o se dice en este video (mismos animales, personajes y situación). Nunca menciones animales, objetos o temas que no aparezcan.
TAREAS:
- "hook": texto grande en pantalla para los primeros 3 s (máx 6 palabras) que obligue a seguir viendo.
- "ctas": 2 llamados a la acción cortos en pantalla (máx 5 palabras) en momentos naturales, entre el 30% y el 80% del video, nunca en los primeros 3 s. Usa el tiempo "t" en segundos.
- "comment_question": pregunta corta para el cierre que invite a comentar.
${mode === 'nueva_voz' ? `- "narration": guion NUEVO y mejor para narrar sobre estas imágenes, MÁXIMO ${Math.max(6, Math.floor(dur * 2.1))} palabras (el video dura ${dur.toFixed(0)} s y no se puede alargar), gancho fuerte al inicio, UN solo tema desarrollado con hilo (cada frase continúa la anterior, explica el porqué y el cómo, sin saltar a otros datos), sin despedida (el sistema agrega el cierre).` : ''}
${cortar ? `- "shorts": el video es largo: elige de 1 a 3 tramos independientes de 25 a 60 s que funcionen solos (empiezan con algo que engancha y terminan en una idea completa). Usa los tiempos de la transcripción: [{"inicio":s,"fin":s,"titulo":"..."}].` : ''}
${rules(ch)}
Devuelve SOLO JSON:
{"title":"título interno","hook":"...","ctas":[{"t":12.5,"text":"..."}],"comment_question":"...","thumbnail_text":"máx 4 palabras",${mode === 'nueva_voz' ? '"narration":"...",' : ''}${cortar ? '"shorts":[{"inicio":0,"fin":45,"titulo":"..."}],' : ''}
"seo":{"youtube":{"title":"máx 60 caracteres, palabra clave al inicio","alt_titles":["","",""],"description":"3 a 5 frases","tags":["15 a 20 frases que la gente busca, la primera = palabra clave"],"keywords":["5 a 8"],"hashtags":["#Shorts","3 a 5"],"pinned_comment":"..."},"tiktok":{"caption":"máx 150 caracteres","hashtags":["4 a 6"]},"facebook":{"caption":"2 o 3 frases","hashtags":["3 a 5"]}}}` }];

// Crítico: califica el guion ANTES de gastar tiempo en el video; si saca menos de 8, lo mejora.
const criticP = (ch, s) => [{ role: 'user', content:
`Eres el crítico más exigente de Shorts virales en español. Canal "${ch.name}" (nicho: ${ch.niche}).
${(ch.manual || []).length ? 'MANUAL DEL CANAL (lecciones aprendidas):\n' + ch.manual.map(m => '- ' + m.t).join('\n') : ''}
${(ch.insights || []).length ? 'LO QUE FUNCIONA EN EL NICHO:\n' + ch.insights.map(x => '- ' + x).join('\n') : ''}
GANCHO EN PANTALLA: ${s.hook}
GUION (una línea por escena):
${s.scenes.map((x, i) => `${i + 1}. ${x.speaker ? x.speaker + ': ' : ''}${x.text}`).join('\n')}
Califica del 1 al 10: gancho del primer segundo, un solo tema con hilo, claridad, utilidad, ritmo, final en bucle y coherencia con el manual.
Si la nota es menor a 8, reescribe para llegar a 9 o más: mismo tema, MISMO número de escenas (${s.scenes.length}), mismos personajes, longitud parecida, sin inventar datos.
${rules(ch)}
Devuelve SOLO JSON: {"nota":7,"motivo":"1 frase","hook":"gancho mejorado (máx 6 palabras) o igual","scenes":["texto escena 1","..."]}` }];

const factP = (ch, s) => [{ role: 'user', content:
`Eres verificador de datos estricto. Revisa este guion para el canal "${ch.name}" (nicho: ${ch.niche}).
Marca toda afirmación falsa, exagerada, no comprobable o peligrosa, y todo lo que viole las políticas de YouTube: desinformación médica (decir que algo cura o reemplaza un tratamiento, contradecir a las autoridades de salud, dosis peligrosas), retos o consejos dañinos, contenido engañoso o clickbait que no se cumple. Corrígela con una versión verdadera y prudente, manteniendo el estilo, la longitud y el número de escenas.
${rules(ch)}
GUION: ${JSON.stringify(s.scenes.map(x => x.text))}
Devuelve SOLO JSON: {"issues":[{"scene":1,"claim":"frase original","problem":"por qué es dudosa"}],"scenes":["texto escena 1 corregido o igual","..."]}` }];

function chatSystem(db) {
  const chs = db.channels.map(c => `- ${c.name} (${c.niche}; estilo ${c.style === 'personaje' ? 'personajes que hablan' : 'fotos con narración'}; ${c.active ? 'activo' : 'pausado'})`).join('\n') || '(todavía no hay canales)';
  const recent = db.jobs.slice(-15).map(j => `- [${j.status}] ${db.channels.find(c => c.id === j.channelId)?.name || '?'}: ${j.topic || 'tema automático'}`).join('\n');
  return `Eres el asistente de ShortForge, experto en crecer y monetizar canales de YouTube Shorts, TikTok y Reels de Facebook en español para Latinoamérica.
Tu usuario se llama Josefino ("Josefino el Fino"), trabaja 4 horas al día y maneja 10 nichos; cada video se publica en las 3 plataformas.
Sus canales:
${chs}
Videos recientes:
${recent || '(ninguno)'}
Lo que el sistema sabe de cada canal (estadísticas reales, manual aprendido y competencia):
${db.channels.map(c => `* ${c.name}: ${c.ytStats ? `${c.ytStats.subs ?? '?'} suscriptores, ${c.ytStats.shortsViews90 ?? '?'} vistas de Shorts en 90 días` : 'sin estadísticas aún'}${(c.notas || []).length ? `; nota promedio ${(c.notas.reduce((a, b) => a + b, 0) / c.notas.length).toFixed(1)}/10` : ''}
  Mejores videos: ${db.jobs.filter(j => j.channelId === c.id && j.stats).sort((a, b) => b.stats.views - a.stats.views).slice(0, 3).map(j => `"${j.title}" (${j.stats.views} vistas${j.stats.pct ? ', ' + j.stats.pct + '% visto' : ''})`).join('; ') || '-'}
  Manual: ${(c.manual || []).map(m => m.t).join(' | ') || '-'}
  Lo que funciona en el nicho: ${(c.insights || []).join(' | ') || '-'}`).join('\n')}
Usa SIEMPRE estos datos reales cuando te pregunte por qué un video funcionó o no, y qué hacer.
Ayúdale con: ideas de temas, nichos con potencial, análisis de canales de competencia (con los datos que te pegue), ganchos, títulos, horarios, estrategia y respuestas a comentarios.
Sé honesto: fuera de los datos de arriba no conoces cifras en vivo; si das otros números, aclara que son estimados. Respeta las políticas de las plataformas (contenido original, sin desinformación de salud, sin spam). Respuestas claras, prácticas y en español.`;
}

const scriptRulesFor = ch => { const cs = charsOf(ch); return scriptRules(ch, cs[0] || '', cs); };
const schemaFor = ch => SCHEMA(charsOf(ch)[0] || '', lenOf(ch).txt);

module.exports = { scriptRulesFor, schemaFor, criticP, lenOf, FORMATS, topicsP, scriptP, inspireP, reeditP, visionP, factP, chatSystem };
