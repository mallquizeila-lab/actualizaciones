// ✏️ La dueña del negocio corrige TODOS los textos de su web desde su panel: portada, servicios (= temáticas),
// paquetes, sobre nosotros, zonas, preguntas frecuentes, por qué elegirnos, pasos y llamado final.
// Si cambia el nombre de un servicio, sus fotos, precios y trabajos se mueven solos al nombre nuevo. Tiene «Deshacer».
const W_ = () => require('./webs');
const c = (t, n) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const cl = (t, n) => String(t ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, n); // conserva saltos de línea
const lineas = (a, n, m) => (Array.isArray(a) ? a : String(a || '').split('\n')).map(x => c(x, m)).filter(Boolean).slice(0, n);

function limpiar(o) {
  const T = {};
  T.hero_titulo = c(o.hero_titulo, 90); T.hero_sub = c(o.hero_sub, 300); T.cta = c(o.cta, 40);
  T.servicios = (o.servicios || []).slice(0, 12).map(s => ({ icono: c(s.icono, 4), t: c(s.t, 80), d: c(s.d, 300), detalles: lineas(s.detalles, 8, 120), orig: c(s.orig, 120) })).filter(s => s.t);
  T.paquetes = (o.paquetes || []).slice(0, 8).map(p => ({ nombre: c(p.nombre, 60), ideal_para: c(p.ideal_para, 120), incluye: lineas(p.incluye, 12, 120), orig: c(p.orig, 120) })).filter(p => p.nombre);
  T.sobre = cl(o.sobre, 2000); T.zonas = c(o.zonas, 200);
  T.faq = (o.faq || []).slice(0, 15).map(f => ({ p: c(f.p, 160), r: c(f.r, 600) })).filter(f => f.p && f.r);
  T.por_que = (o.por_que || []).slice(0, 8).map(f => ({ t: c(f.t, 80), d: c(f.d, 240) })).filter(f => f.t);
  T.pasos = (o.pasos || []).slice(0, 8).map(f => ({ t: c(f.t, 80), d: c(f.d, 240) })).filter(f => f.t);
  T.cta_final = { t: c(o.cta_final?.t, 90), d: c(o.cta_final?.d, 240) };
  return T;
}

// Mueve fotos, precios y trabajos cuando cambia el nombre de un servicio o paquete
function renombrar(w, viejo, nuevo, tipo) {
  if (!viejo || !nuevo || viejo === nuevo) return;
  const mover = (obj, k1, k2) => { if (obj && obj[k1] !== undefined && obj[k2] === undefined) { obj[k2] = obj[k1]; delete obj[k1]; } };
  if (tipo === 'serv') {
    mover(w.fotoServ, viejo, nuevo); mover(w.precios?.serv, viejo, nuevo);
    for (const t of w.trabajos || []) if (t.cat === viejo) t.cat = nuevo;
    for (const [f, k] of Object.entries(w.fotoCat || {})) if (k === viejo) w.fotoCat[f] = nuevo;
  } else mover(w.precios?.paq, viejo, nuevo);
}

function guardar(w, o) {
  const N = limpiar(o.textos || {}), V = w.textos || {};
  if (!N.servicios.length) throw new Error('Deja al menos un servicio');
  if (N.hero_titulo.length < 3) throw new Error('Escribe el título de la portada');
  w.textosPrev = JSON.parse(JSON.stringify({ textos: V, fotoServ: w.fotoServ || {}, precios: w.precios || null, cats: (w.trabajos || []).map(t => [t.id, t.cat]), fotoCat: w.fotoCat || {} }));
  for (const s of N.servicios) { renombrar(w, s.orig, s.t, 'serv'); delete s.orig; }
  for (const p of N.paquetes) { renombrar(w, p.orig, p.nombre, 'paq'); delete p.orig; }
  w.textos = { ...V, ...N, cta_final: N.cta_final.t ? N.cta_final : V.cta_final, editadoPorCliente: new Date().toISOString() };
  W_().guardar(); return { ok: 1 };
}
function deshacer(w) {
  const P = w.textosPrev; if (!P) throw new Error('No hay cambios para deshacer');
  w.textos = P.textos; w.fotoServ = P.fotoServ; w.precios = P.precios || w.precios; w.fotoCat = P.fotoCat;
  const m = new Map(P.cats); for (const t of w.trabajos || []) if (m.has(t.id)) t.cat = m.get(t.id);
  delete w.textosPrev; W_().guardar(); return { ok: 1 };
}
function accion(w, o) {
  if (o.accion === 'textos') return guardar(w, o);
  if (o.accion === 'deshacerTextos') return deshacer(w);
  return null;
}

const html = w => w.textos ? `<details class="card" id="textos"><summary style="cursor:pointer;font-weight:700">✏️ Textos de mi web (corrige lo que quieras)</summary>
<p style="color:#64748b;font-size:.9rem;margin:6px 0">Todo lo que dice tu página. Si cambias el nombre de un servicio, sus fotos, precios y trabajos se mueven solos. Después pulsa «Guardar textos» y luego «Publicar cambios».</p>
<div id="edTx"></div>
<p style="margin:14px 0 0;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" id="guardarTx">💾 Guardar textos</button>${w.textosPrev ? '<button class="btn gris" type="button" id="deshacerTx">↩ Deshacer último cambio</button>' : ''}</p></details>` : '';

const css = `#edTx h3{font-size:1rem;margin:18px 0 6px;color:#5b21b6}.it{border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin:8px 0;background:#fafafa;position:relative}.it .x{position:absolute;right:8px;top:8px;border:0;background:#fee2e2;color:#991b1b;border-radius:8px;padding:4px 8px;cursor:pointer}.it .fila{display:flex;gap:8px;margin-right:48px}.it>label:nth-of-type(1){margin-right:48px}.it .fila input:first-child{width:64px;flex:none;text-align:center}.add{border:2px dashed #c4b5fd;background:#fff;color:#5b21b6;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer}.it label{font-weight:600;font-size:.85rem;margin:6px 0 2px}`;

const js = w => !w.textos ? '' : `(()=>{const T=${JSON.stringify(w.textos).replace(/</g, '\\u003c')},box=document.getElementById('edTx');if(!box)return;
const D={hero_titulo:T.hero_titulo||'',hero_sub:T.hero_sub||'',cta:T.cta||'',sobre:T.sobre||'',zonas:T.zonas||'',cta_final:{t:(T.cta_final||{}).t||'',d:(T.cta_final||{}).d||''},
servicios:(T.servicios||[]).map(s=>({icono:s.icono||'',t:s.t||'',d:s.d||'',detalles:(s.detalles||[]).join('\\n'),orig:s.t||''})),paquetes:(T.paquetes||[]).map(p=>({nombre:p.nombre||'',ideal_para:p.ideal_para||'',incluye:(p.incluye||[]).join('\\n'),orig:p.nombre||''})),
faq:(T.faq||[]).map(f=>({p:f.p||'',r:f.r||''})),por_que:(T.por_que||[]).map(f=>({t:f.t||'',d:f.d||''})),pasos:(T.pasos||[]).map(f=>({t:f.t||'',d:f.d||''}))};
const el=(tag,at={},...h)=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(at)){if(k==='on')e.oninput=v;else if(k==='click')e.onclick=v;else e.setAttribute(k,v)}h.forEach(x=>e.append(x));return e};
const campo=(lab,obj,k,o={})=>{const i=el(o.area?'textarea':'input',{maxlength:o.max||200,rows:o.rows||3,placeholder:o.ph||''});i.value=obj[k]||'';i.oninput=()=>obj[k]=i.value;return[el('label',{},lab),i]};
const lista=(tit,arr,nuevo,pinta,max,txtAdd)=>{const w=el('div');const dib=()=>{w.innerHTML='';w.append(el('h3',{},tit));arr.forEach((x,i)=>{const it=el('div',{class:'it'});it.append(el('button',{type:'button',class:'x',title:'Quitar',click:()=>{if(confirm('¿Quitar este elemento?')){arr.splice(i,1);dib()}}},'🗑'),...pinta(x));w.append(it)});if(arr.length<max)w.append(el('button',{type:'button',class:'add',click:()=>{arr.push(nuevo());dib()}},txtAdd))};dib();return w};
box.append(el('h3',{},'🏠 Portada'),...campo('Título grande',D,'hero_titulo',{max:90}),...campo('Frase debajo del título',D,'hero_sub',{max:300,area:1,rows:2}),...campo('Texto del botón',D,'cta',{max:40,ph:'Ej: Cotizar por WhatsApp'}));
box.append(lista('🎉 Servicios (son tus temáticas)',D.servicios,()=>({icono:'🎈',t:'',d:'',detalles:'',orig:''}),s=>{const f=el('div',{class:'fila'});const ic=el('input',{maxlength:4,title:'Emoji'});ic.value=s.icono;ic.oninput=()=>s.icono=ic.value;const t=el('input',{maxlength:80,placeholder:'Nombre del servicio'});t.value=s.t;t.oninput=()=>s.t=t.value;f.append(ic,t);return[f,...campo('Descripción',s,'d',{max:300,area:1,rows:2}),...campo('Detalles (uno por línea)',s,'detalles',{max:900,area:1,rows:3})]},12,'➕ Agregar servicio'));
box.append(lista('📦 Paquetes',D.paquetes,()=>({nombre:'',ideal_para:'',incluye:'',orig:''}),p=>[...campo('Nombre del paquete',p,'nombre',{max:60}),...campo('Ideal para',p,'ideal_para',{max:120}),...campo('Qué incluye (uno por línea)',p,'incluye',{max:1400,area:1,rows:4})],8,'➕ Agregar paquete'));
box.append(el('h3',{},'👋 Sobre nosotros'),...campo('Cuenta tu historia',D,'sobre',{max:2000,area:1,rows:6}),...campo('Zonas donde atiendes',D,'zonas',{max:200,ph:'Ej: Todo Lima y Callao'}));
box.append(lista('⭐ ¿Por qué elegirnos?',D.por_que,()=>({t:'',d:''}),f=>[...campo('Título',f,'t',{max:80}),...campo('Explicación',f,'d',{max:240,area:1,rows:2})],8,'➕ Agregar razón'));
box.append(lista('🧭 Cómo trabajamos (pasos)',D.pasos,()=>({t:'',d:''}),f=>[...campo('Paso',f,'t',{max:80}),...campo('Explicación',f,'d',{max:240,area:1,rows:2})],8,'➕ Agregar paso'));
box.append(lista('❓ Preguntas frecuentes',D.faq,()=>({p:'',r:''}),f=>[...campo('Pregunta',f,'p',{max:160}),...campo('Respuesta',f,'r',{max:600,area:1,rows:3})],15,'➕ Agregar pregunta'));
box.append(el('h3',{},'📣 Llamado final (al fondo de la página)'),...campo('Título',D.cta_final,'t',{max:90}),...campo('Texto',D.cta_final,'d',{max:240}));
document.getElementById('guardarTx').onclick=async()=>{const j=await acc({accion:'textos',textos:D});if(j.error)return alert(j.error);alert('💾 Textos guardados. Pulsa «Publicar cambios» para verlos en tu web.');location.reload()};
const dz=document.getElementById('deshacerTx');if(dz)dz.onclick=async()=>{if(!confirm('¿Volver a como estaban los textos antes del último cambio?'))return;const j=await acc({accion:'deshacerTextos'});if(j.error)return alert(j.error);location.reload()};})();`;

module.exports = { accion, html, css, js, limpiar };
