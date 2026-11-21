// 🎁 Recursos gratuitos para docentes (imán de contactos). Contenido original de ProfeTok, listo para imprimir o guardar en PDF.
// La escala AD, A, B, C es la del Currículo Nacional (CNEB); el resto (formatos y mensajes) es redacción propia.
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BASE = [
  { slug: 'registro-auxiliar', emoji: '📋', titulo: 'Registro auxiliar de evaluación (CNEB)', descripcion: 'Formato imprimible para 35 estudiantes, 3 competencias y nivel de logro AD, A, B, C. Listo para el bimestre.' },
  { slug: 'sesion-de-aprendizaje', emoji: '🗂️', titulo: 'Plantilla de sesión de aprendizaje', descripcion: 'Estructura completa: propósito, competencias, criterios, evidencias, inicio, desarrollo y cierre, con preguntas guía.' },
  { slug: 'mensajes-familias', emoji: '💬', titulo: '30 mensajes listos para las familias', descripcion: 'Reuniones, tareas, felicitaciones, faltas y recordatorios. Copia y pega en WhatsApp con un toque.' },
];

const MENSAJES = [
  ['📅 Reuniones', [
    'Buenas tardes, familias de {aula} 👋. Las invitamos a la reunión del bimestre el {día} a las {hora}. Conversaremos sobre el avance de sus hijos y cómo apoyarlos en casa. ¡Su presencia es muy importante!',
    'Estimada familia de {alumno}: me gustaría conversar unos minutos sobre su avance. ¿Podríamos reunirnos el {día} a las {hora}? Si ese horario no le acomoda, dígame cuál le conviene. Gracias 🙏',
    'Recordatorio 🔔: mañana es nuestra reunión de padres a las {hora}. Si no puede asistir, responda este mensaje y le envío el resumen.',
    'Gracias a todas las familias que asistieron hoy a la reunión 💙. Les comparto los acuerdos: {acuerdos}. Cualquier consulta, estoy para ayudarles.',
  ]],
  ['📝 Tareas y estudio', [
    'Hola, familias 👋. Para mañana los niños deben traer: {materiales}. ¡Gracias por su apoyo!',
    'Tarea de {curso} 📚: {tarea}. Fecha de entrega: {día}. Les pido acompañar a sus hijos unos minutos, sin hacerla por ellos 😉.',
    'Esta semana repasaremos {tema}. En casa pueden ayudar preguntándoles: «¿qué aprendiste hoy?» y pidiéndoles que lo expliquen con sus palabras.',
    'Estimada familia de {alumno}: noto que tiene tareas pendientes de {curso}. ¿Podemos ayudarle juntos a ponerse al día esta semana? Cuente conmigo.',
    'Recordatorio 🗓️: el {día} es la evaluación de {curso}. Lo más importante es que descanse bien la noche anterior y desayune antes de venir.',
    'Les comparto una idea para leer en casa 📖: 15 minutos al día, ustedes leen una página y su hijo(a) la siguiente. ¡Hace una gran diferencia!',
  ]],
  ['🌟 Felicitaciones', [
    '¡Felicitaciones a {alumno}! 🌟 Hoy {logro}. Estoy muy orgullosa(o) de su esfuerzo. Por favor, celébrenlo también en casa.',
    'Querida familia de {alumno}: quería contarles que ha mejorado mucho en {curso} 📈. Se nota el apoyo de casa. ¡Gracias y sigamos así!',
    '¡Qué alegría! 🎉 Nuestra aula logró {meta}. Gracias, familias, por acompañar a sus hijos en cada paso.',
    'Hoy {alumno} ayudó a un compañero que lo necesitaba 💙. Esos valores también se aprenden en casa. ¡Felicitaciones!',
    '{alumno} participó con mucha seguridad en {actividad}. ¡Se está volviendo muy valiente para expresar sus ideas! 👏',
  ]],
  ['🚸 Asistencia y puntualidad', [
    'Estimada familia de {alumno}: hoy no asistió a clases. ¿Se encuentra bien? Si necesita algo, avíseme para enviarle lo que avanzamos 🙏.',
    'Hola 👋. {alumno} llegó tarde {n} veces esta semana. Recordemos que el ingreso es a las {hora}. ¿Hay algo en lo que pueda ayudar?',
    'Familias: la puntualidad ayuda mucho a que los niños empiecen el día tranquilos ⏰. El ingreso es a las {hora}. ¡Gracias por su apoyo!',
    'Para justificar una falta, por favor envíenme un mensaje o una nota indicando el motivo. Así lo registro correctamente ✅.',
  ]],
  ['⚠️ Avisos importantes', [
    'Aviso 📢: el {día} no habrá clases por {motivo}. Retomamos el {día2} en el horario normal.',
    'Les recuerdo que el {día} es la actuación por {fecha}. Los niños deben venir con {vestimenta}. ¡Los esperamos! 🎭',
    'Por favor, revisen que la lonchera tenga agua y una fruta 🍎. Los niños rinden mejor con una alimentación saludable.',
    'Cambio de horario: desde el {día}, la salida será a las {hora}. Gracias por tomarlo en cuenta 🙏.',
    'Si su hijo(a) presenta fiebre o malestar, es mejor que descanse en casa y se recupere. Avísenme para enviarle las actividades 💙.',
  ]],
  ['🤝 Acompañamiento', [
    'Estimada familia de {alumno}: estoy notando que le está costando {dificultad}. Me gustaría que trabajemos juntos. ¿Podemos conversar esta semana?',
    'Gracias por su mensaje 🙏. Lo revisaré con calma y le responderé hoy antes de las {hora}.',
    'Les comparto el avance del bimestre de {alumno}: {resumen}. Cualquier duda, con gusto la conversamos.',
    'Familias: este es un canal para temas del aula 💙. Para conversaciones personales, escríbanme por privado y les respondo con gusto.',
    'Al cerrar el bimestre, quiero agradecerles por acompañar a sus hijos 💐. Juntos, escuela y familia, logramos más.',
    'Hola 👋. Les recuerdo que pueden ver la asistencia, las notas y las tareas de su hijo(a) en ProfeTok, desde su celular, cuando quieran 📱.',
  ]],
];

function pagina(titulo, cuerpo, { horizontal = false } = {}) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)} · ProfeTok</title><link rel="icon" href="/icono.svg">
<style>*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#0f172a;background:#f0f9ff}.hoja{max-width:${horizontal ? 1100 : 820}px;margin:16px auto;background:#fff;padding:26px;border-radius:14px;box-shadow:0 6px 24px #0369a122}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:20px 0 8px;color:#0369a1}h3{font-size:15px;margin:14px 0 6px}p{line-height:1.5}.muted{color:#64748b;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}td,th{border:1px solid #94a3b8;padding:5px;vertical-align:top}th{background:#e0f2fe}.campo{border-bottom:1px solid #94a3b8;display:inline-block;min-width:180px;height:18px}
.barra{max-width:${horizontal ? 1100 : 820}px;margin:12px auto 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:0 12px}.btn{background:#0284c7;color:#fff;border:0;border-radius:10px;padding:10px 16px;font-weight:bold;font-size:15px;cursor:pointer;text-decoration:none;display:inline-block}.btn.amar{background:#fbbf24;color:#3b2500}
.msg{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin:8px 0;display:flex;gap:10px;align-items:flex-start;justify-content:space-between}.msg button{flex:none;background:#e0f2fe;color:#0369a1;border:0;border-radius:8px;padding:6px 10px;font-weight:bold;cursor:pointer}
.pie{max-width:${horizontal ? 1100 : 820}px;margin:0 auto 30px;padding:16px;background:linear-gradient(135deg,#0369a1,#0ea5e9);color:#fff;border-radius:14px;display:flex;gap:14px;align-items:center}.pie img{width:70px}.pie p{margin:4px 0}
.guia{color:#64748b;font-style:italic}.marca{font-size:12px;color:#64748b;text-align:right;margin-top:10px}
@media print{body{background:#fff}.barra,.pie,.msg button{display:none}.hoja{box-shadow:none;margin:0;max-width:none;border-radius:0;padding:0}@page{size:${horizontal ? 'A4 landscape' : 'A4'};margin:12mm}}
</style></head><body><div class="barra"><button class="btn" onclick="print()">🖨️ Imprimir o guardar en PDF</button><a class="btn amar" href="/?utm_source=recurso#/registro">🎁 Probar ProfeTok gratis</a></div>
<div class="hoja">${cuerpo}<div class="marca">Recurso gratuito de ProfeTok · Puedes imprimirlo y compartirlo con tus colegas.</div></div>
<div class="pie"><img src="/libretin.svg" alt=""><div><b>¿Y si esto se hiciera solo?</b><p>En ProfeTok marcas la asistencia con un toque, los promedios se calculan solos, las familias ven el avance en su celular y Libretín te arma sesiones y exámenes con IA.</p><a class="btn amar" href="/?utm_source=recurso#/registro">Probar 15 días gratis</a></div></div></body></html>`;
}

function interno(slug) {
  if (slug === 'registro-auxiliar') {
    const comp = [1, 2, 3], filas = Array.from({ length: 35 }, (_, i) => `<tr><td style="text-align:center">${i + 1}</td><td></td>${comp.map(() => '<td></td><td></td><td></td><td style="background:#f8fafc"></td>').join('')}<td style="background:#e0f2fe"></td></tr>`).join('');
    return pagina('Registro auxiliar de evaluación', `<h1>📋 Registro auxiliar de evaluación</h1>
<p>I.E.: <span class="campo" style="min-width:260px"></span> Docente: <span class="campo" style="min-width:220px"></span> Grado y sección: <span class="campo" style="min-width:90px"></span></p>
<p>Área: <span class="campo"></span> Bimestre / trimestre: <span class="campo" style="min-width:60px"></span> Año: <span class="campo" style="min-width:60px"></span></p>
<table><tr><th rowspan="2" style="width:28px">N.°</th><th rowspan="2" style="min-width:210px">Apellidos y nombres</th>${comp.map(c => `<th colspan="4">Competencia ${c}: <span class="campo" style="min-width:120px;height:14px"></span></th>`).join('')}<th rowspan="2" style="width:52px">Nivel final</th></tr>
<tr>${comp.map(() => '<th>Ev. 1</th><th>Ev. 2</th><th>Ev. 3</th><th>NL</th>').join('')}</tr>${filas}</table>
<p class="muted"><b>Escala (CNEB):</b> <b>AD</b> = logro destacado · <b>A</b> = logro esperado · <b>B</b> = en proceso · <b>C</b> = en inicio. <b>NL</b> = nivel de logro de la competencia, que se decide mirando la evolución de las evidencias (no es un promedio mecánico).</p>`, { horizontal: true });
  }
  if (slug === 'sesion-de-aprendizaje') {
    const g = t => `<span class="guia">${t}</span>`;
    return pagina('Plantilla de sesión de aprendizaje', `<h1>🗂️ Sesión de aprendizaje</h1>
<h2>1. Datos informativos</h2><table><tr><td>I.E.</td><td></td><td>Docente</td><td></td></tr><tr><td>Grado y sección</td><td></td><td>Área</td><td></td></tr><tr><td>Fecha</td><td></td><td>Duración</td><td></td></tr></table>
<h2>2. Título de la sesión</h2><p>${g('Escríbelo como un reto atractivo. Ej.: «¿Cómo repartimos el queque en partes iguales?»')}</p><p class="campo" style="width:100%"></p>
<h2>3. Propósito de la sesión</h2><p>${g('Lo que los estudiantes lograrán hoy, dicho para ellos. Ej.: «Hoy aprenderemos a representar fracciones con material concreto».')}</p><p class="campo" style="width:100%"></p>
<h2>4. Propósitos de aprendizaje y evidencias</h2><table><tr><th>Competencia y capacidades</th><th>Desempeños (precisados)</th><th>Criterios de evaluación</th><th>Evidencia</th><th>Instrumento</th></tr><tr style="height:110px"><td></td><td></td><td></td><td></td><td>${g('Lista de cotejo, rúbrica o escala')}</td></tr></table>
<h3>Enfoques transversales</h3><table><tr><th>Enfoque</th><th>Acciones observables</th></tr><tr style="height:50px"><td></td><td></td></tr></table>
<h2>5. Preparación de la sesión</h2><table><tr><th>¿Qué necesito hacer antes?</th><th>¿Qué recursos o materiales usaré?</th></tr><tr style="height:70px"><td></td><td></td></tr></table>
<h2>6. Momentos de la sesión</h2><table><tr><th style="width:110px">Momento</th><th>Actividades</th><th style="width:70px">Tiempo</th></tr>
<tr style="height:120px"><td><b>Inicio</b></td><td>${g('Recoge saberes previos, plantea el problema o reto y comunica el propósito. Preguntas guía: ¿qué sabemos de…?, ¿alguna vez…?, ¿cómo podríamos…?')}</td><td></td></tr>
<tr style="height:200px"><td><b>Desarrollo</b></td><td>${g('Los estudiantes exploran, prueban y construyen. Acompaña con preguntas, retroalimenta y atiende a quienes lo necesitan. Cierra cada paso con una idea clave.')}</td><td></td></tr>
<tr style="height:110px"><td><b>Cierre</b></td><td>${g('Metacognición: ¿qué aprendimos hoy?, ¿cómo lo aprendimos?, ¿para qué nos sirve?, ¿qué fue lo más difícil?')}</td><td></td></tr></table>
<h2>7. Reflexiones sobre el aprendizaje</h2><p>${g('¿Qué avances tuvieron mis estudiantes? ¿Qué dificultades hubo? ¿Qué funcionó y qué cambiaré la próxima vez?')}</p><p class="campo" style="width:100%"></p><p class="campo" style="width:100%"></p>`);
  }
  if (slug === 'mensajes-familias') {
    return pagina('30 mensajes para las familias', `<h1>💬 30 mensajes listos para las familias</h1><p class="muted">Cambia lo que está entre llaves { } y pulsa «Copiar» para pegarlo en WhatsApp. Escritos con respeto, claros y cálidos.</p>
${MENSAJES.map(([t, l]) => `<h2>${t}</h2>${l.map(m => `<div class="msg"><span>${esc(m)}</span><button onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent);this.textContent='✅ Copiado'">Copiar</button></div>`).join('')}`).join('')}`);
  }
  return null;
}

// recurso creado por el dueño (texto simple: # título, - viñetas, párrafos)
function texto(titulo, contenido) {
  const h = esc(contenido).split(/\n{2,}/).map(b => /^# /.test(b) ? `<h2>${b.slice(2)}</h2>` : /^- /m.test(b) ? `<ul>${b.split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('')}</ul>` : `<p>${b.replace(/\n/g, '<br>')}</p>`).join('');
  return pagina(titulo, `<h1>${esc(titulo)}</h1>${h}`);
}
module.exports = { BASE, interno, texto, pagina, esc };
