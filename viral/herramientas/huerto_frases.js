// Genera public/huerto/frases.json (frases con la voz de cada personaje) y public/huerto/personajes.json
// (descripciones para crear sus ilustraciones con IA). Ejecutar: node herramientas/huerto_frases.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'huerto.js'), 'utf8');
const bloque = n => { const i = src.indexOf(`const ${n} = {`); let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; if (src[k] === '}' && --d === 0) return Function('return ' + src.slice(j, k + 1))(); } };
const FRASES = bloque('FRASES'), ENE = bloque('ENE'), DEF = bloque('DEF');
// misma fórmula que el juego (idFrase en huerto.js)
const idFrase = (q, txt) => { let h = 0; const t = q + '|' + txt; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) >>> 0; return q + '_' + h.toString(36); };
// Voz de la biblioteca (Edge) para cada personaje: rate en %, pitch en Hz
const VOCES = {
  gusano: ['es-MX-JorgeNeural', 12, 35], caracol: ['es-ES-AlvaroNeural', -18, -20], langosta: ['es-CO-SalomeNeural', 22, 40], escarabajo: ['es-AR-TomasNeural', -8, -35],
  rata: ['es-MX-JorgeNeural', -6, -45], polilla: ['es-PE-CamilaNeural', 18, 35], topo: ['es-CL-LorenzoNeural', 5, -10],
  hongo: ['es-PE-CamilaNeural', 5, 15], choclo: ['es-PE-AlexNeural', 8, 5], coco: ['es-ES-AlvaroNeural', -10, -30], aji: ['es-MX-DaliaNeural', 25, 30], limon: ['es-CO-SalomeNeural', 5, 10],
  pina: ['es-VE-PaolaNeural', 10, 20], palta: ['es-AR-ElenaNeural', 5, 0], maracuya: ['es-CL-LorenzoNeural', 12, 10], cebolla: ['es-UY-ValentinaNeural', -5, 5], quinua: ['es-BO-SofiaNeural', 0, 5],
  narrador: ['es-PE-AlexNeural', 5, 0], gallina: ['es-MX-DaliaNeural', 22, 60],
};
const lista = [], add = (q, txt) => { const [edge, rate, pitch] = VOCES[q]; const id = idFrase(q, txt); if (!lista.some(f => f.id === id)) lista.push({ id, texto: txt, voz: { edge, rate, pitch } }); };
for (const tipo of Object.keys(ENE)) { for (const t of FRASES.llega[tipo] || []) add(tipo, t); for (const t of [...FRASES.come, ...FRASES.muere, ...FRASES.entra, ...FRASES.burla]) add(tipo, t); }
for (const t of FRASES.gallina) add('gallina', t);
for (const [k, l] of Object.entries(FRASES.def)) for (const t of l) add(k, t);
for (const t of [...FRASES.gana, ...FRASES.pierde, '¡Cuidado! ¡Se viene una gran oleada!', '¡Triple!', '¡Imparable!', '¡Furia del huerto!']) add('narrador', t);
add('aji', '¡Picanteee!');
fs.writeFileSync(path.join(__dirname, '..', 'public', 'huerto', 'frases.json'), JSON.stringify({ frases: lista }));
// Personajes originales: descripción en inglés para el generador de imágenes y color de fondo para recortarlos
const P = {
  hongo: 'a friendly teal-capped mushroom with white spots and a cream stem, big kind eyes, tiny smile',
  choclo: 'a brave corn cob warrior with golden kernels and green husk leaves like a cape, determined eyes',
  coco: 'a tough hairy brown coconut with a stern frowning face and crossed arms, sturdy like a wall',
  aji: 'an angry red hot chili pepper with tiny flames on its head, fiery eyes, explosive attitude',
  limon: 'a cheerful round lime with frosty ice crystals on its peel, cool confident eyes',
  pina: 'a mischievous pineapple with spiky green crown and a sneaky grin, holding a tiny fuse',
  palta: 'a heroic avocado half with a big brown seed belly, two little arms, strong pose',
  maracuya: 'a purple passion fruit with a glowing yellow lightning bolt on top, electric sparks around it',
  cebolla: 'a purple red onion with green sprout hair, teary watery eyes, crying dramatically',
  quinua: 'a small quinoa plant spirit with a crown of orange and red grain clusters, gentle healer face, green leaves as arms',
  gusano: 'a sneaky green caterpillar worm with segmented body, mischievous hungry grin',
  caracol: 'a slow snail wearing an armored spiral shell like a helmet, smug face',
  langosta: 'a fast green grasshopper locust with long jumping legs, cheeky expression',
  escarabajo: 'a big armored purple beetle like a tank, shiny shell, tough angry face',
  rata: 'a giant boss rat with grey fur, a small golden crown, sharp teeth and a villain grin',
  polilla: 'a fluffy brown night moth with big patterned wings spread, glowing eyes',
  topo: 'a mole digger with brown fur, pink star nose, big claws and a miner helmet with lamp',
};
const morado = ['maracuya', 'cebolla', 'escarabajo'];
const personajes = Object.entries(P).map(([id, d]) => ({ id, nombre: (DEF[id] || ENE[id]).n, fondo: morado.includes(id) ? 'verde' : 'magenta', prompt: `${d}, original character, high quality 3D animated movie style, detailed realistic textures, expressive face, full body, centered, facing the camera` }));
fs.writeFileSync(path.join(__dirname, '..', 'public', 'huerto', 'personajes.json'), JSON.stringify({ personajes }, null, 1));
console.log('frases', lista.length, 'personajes', personajes.length);
