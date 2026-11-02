// ⚙️ Motor de combate de GLORY BROWN (sin dibujos ni pantalla). Lo usa el celular para jugar contra la máquina
// y el SERVIDOR para las partidas en línea: así nadie puede hacer trampa cambiando su navegador.
(function (root) {
  const AN = 18, AL = 32, RIO0 = 15, RIO1 = 17, PUENTES = [3.5, 14.5];
  const mult = nv => 1 + (nv - 1) * .08;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const r1 = v => Math.round(v * 10) / 10;

  // o: { G, CARTA, n4, arenaI, asientos:[{a, team, ctrl:'jugador'|'ia', mazo:[8], niv:{id:nv}, nombre}], ev:{efecto, son, texto, habla, voz, emote, fin} }
  function crear(o) {
    const { G, CARTA, n4 = false, arenaI = 0 } = o, B = G.balance, ev = Object.assign({ efecto() {}, son() {}, texto() {}, habla() {}, voz() {}, emote() {}, fin() {} }, o.ev || {});
    const azar = l => l[Math.floor(Math.random() * l.length)], baraja = l => [...l].sort(() => Math.random() - .5);
    const S = { ents: [], proys: [], zonas: [], tiempo: B.duracion, extra: false, coronas: [0, 0], fin: false, ganador: undefined, uid: 0, charlaT: 3, iaEmoT: 10 };
    S.asientos = o.asientos.map(x => { const m = baraja(x.mazo); return { ...x, mana: B.manaInicial, mano: m.slice(0, 4), cola: m.slice(4), iaT: 2 + x.a * .7 }; });
    const torre = (team, x, y, rey) => { const tb = rey ? B.rey : B.torre, hp = tb.vida * (n4 ? 1.35 : 1); S.ents.push({ id: ++S.uid, team, torre: 1, rey, x, y, hp, max: hp, r: rey ? 1.9 : 1.5, rango: tb.rango, dmg: tb.dmg, golpe: tb.golpe, cd: 0, activo: !rey, obj: 'todo', aAire: 1, buf: {} }); };
    torre(0, 3.5, 25.5); torre(0, 14.5, 25.5); torre(0, 9, 28.4, 1); torre(1, 3.5, 6.5); torre(1, 14.5, 6.5); torre(1, 9, 3.6, 1);
    const torres = tm => S.ents.filter(e => e.torre && e.team === tm && e.hp > 0);
    function habla(e, clave, i, forzar) { if (!e || !e.card?.frases || e.hp <= 0) return; const l = e.card.frases[clave]; if (!l) return; const n = Array.isArray(l) ? l.length : 1; ev.habla(e, clave, i ?? Math.floor(Math.random() * n), forzar); }

    function crearUnidad(team, card, x, y, nv, extra = {}) {
      const m = mult(nv || 1), e = { id: ++S.uid, team, card, cid: card.id, x: Math.max(.5, Math.min(AN - .5, x)), y: Math.max(.5, Math.min(AL - .5, y)), hp: card.hp * m, max: card.hp * m, dmg: (card.dmg || 0) * m, golpe: card.golpe, rango: card.rango || 1, vel: card.vel, r: card.r, obj: card.obj, aire: card.aire, aAire: card.aAire || card.aire, area: card.area, proy: card.proy, hab: card.hab, cd: .4, nace: 1, t: Math.random() * 5, at: 0, buf: {}, habT: card.hab?.cada || 0, recorrido: 0, ...extra };
      if (card.tipo === 'estructura') { e.estructura = 1; e.vida = card.dur || 30; }
      if (card.hab?.tipo === 'invisible') e.invis = 1;
      if (card.hab?.tipo === 'reina') e.rt = { luz: 4, rayo: 6, escudo: 8, corazon: 12 };
      S.ents.push(e); return e;
    }
    function desplegar(as, key, x, y) {
      const card = CARTA[key], nv = as.niv[key] || 1, team = as.team;
      if (card.tipo === 'hechizo') return hechizo(team, card, x, y, mult(nv));
      const n = card.cant || 1; let primera = null;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, d = n > 1 ? .55 + n * .08 : 0; const e = crearUnidad(team, card, x + Math.cos(a) * d, y + Math.sin(a) * d, nv); primera = primera || e; }
      ev.efecto({ tipo: 'aparece', x, y, v: .6, max: .6, team, reina: key === 'glory_brown' });
      if (key === 'glory_brown') { ev.texto('👑 ¡GLORY BROWN ENTRA A LA BATALLA!', { tam: .75, dur: 2.4, y: 14.4 }); ev.son('nivel'); setTimeout(() => habla(primera, 'aparece', null, true), 300); }
      else if (Math.random() < .6) setTimeout(() => habla(primera, 'aparece'), 450);
    }
    function hechizo(team, c, x, y, m) {
      const enemigos = () => S.ents.filter(e => e.team !== team && e.hp > 0), aliados = () => S.ents.filter(e => e.team === team && e.hp > 0 && !e.torre), en = (e, r) => Math.hypot(e.x - x, e.y - y) < r + (e.torre ? e.r : 0), col = c.color || '#fde047';
      ev.son('swish');
      switch (c.arq) {
        case 'bola': case 'meteoro': { const rey = torres(team).find(e => e.rey) || { x: 9, y: team ? 3.6 : 28.4 }; S.proys.push({ x: c.arq === 'meteoro' ? x : rey.x, y: c.arq === 'meteoro' ? y - 12 * (team ? -1 : 1) : rey.y, tx: x, ty: y, v: c.arq === 'meteoro' ? 10 : 13, tipo: 'bola', team, dmg: c.dmg * m, radio: c.radio, color: col, grande: c.arq === 'meteoro' }); break; }
        case 'congelar': for (const e of enemigos()) if (en(e, c.radio)) { e.buf.aturdido = (c.dur || 4) * (e.torre ? .6 : 1); herir(e, (c.dmg || 0) * m); } ev.efecto({ tipo: 'hielo', x, y, r: c.radio, v: 1, max: 1, c: col }); ev.son('hielo'); break;
        case 'rayo': { const obj = enemigos().filter(e => en(e, c.radio)).sort((a, b) => b.hp - a.hp).slice(0, c.objetivos || 3); for (const e of obj) { herir(e, c.dmg * m * (e.torre ? .35 : 1)); ev.efecto({ tipo: 'rayo', x: e.x, y: e.y, v: .5, max: .5 }); } ev.efecto({ tipo: 'sacudida', v: .3, max: .3 }); ev.son('explosion'); break; }
        case 'linea': { const dir = team ? 1 : -1; for (const e of enemigos()) if (Math.abs(e.x - x) < (c.ancho || 1.2) + e.r * .5 && (e.y - y) * dir >= -.5 && (e.y - y) * dir <= (c.largo || 9)) herir(e, c.dmg * m * (e.torre ? .35 : 1)); ev.efecto({ tipo: 'linea', x, y, l: (c.largo || 9) * dir, w: c.ancho || 1.2, v: .6, max: .6, c: col }); ev.son('swish'); break; }
        case 'cura': case 'veneno': case 'furia': case 'tornado': S.zonas.push({ tipo: c.arq, team, x, y, radio: c.radio, hasta: S.tiempo - (c.dur || 4), valor: (c.valor || c.dmg || 0) * m, pct: c.pct || 40, col, tick: 0 }); ev.efecto({ tipo: 'zona', x, y, r: c.radio, v: Math.min(8, c.dur || 4), max: Math.min(8, c.dur || 4), c: col }); ev.son(c.arq === 'cura' ? 'ganar' : 'hielo'); break;
        case 'empuje': for (const e of enemigos()) if (!e.torre && en(e, c.radio)) { const a = Math.atan2(e.y - y, e.x - x); e.x += Math.cos(a) * 2.2; e.y += Math.sin(a) * 2.2; herir(e, c.dmg * m); } ev.efecto({ tipo: 'onda', x, y, r: c.radio, v: .5, max: .5, c: col }); ev.son('swish'); break;
        case 'escudo': for (const e of aliados()) if (en(e, c.radio)) { e.buf.escudo = (c.valor || 400) * m; e.buf.escudoT = c.dur || 8; } ev.efecto({ tipo: 'escudo', x, y, r: c.radio, v: 1, max: 1 }); ev.son('nivel'); break;
        case 'invoca': { const mini = CARTA['_' + (c.unidad || 'esbirro')]; for (let i = 0; i < (c.cantidad || 4); i++) { const a = i / 4 * Math.PI * 2; crearUnidad(team, mini, x + Math.cos(a) * .8, y + Math.sin(a) * .8, Math.round(m * 10 - 9)); } ev.efecto({ tipo: 'onda', x, y, r: 1.6, v: .6, max: .6, c: '#7c3aed' }); ev.son('jefe'); break; }
        case 'drenar': { let tot = 0; for (const e of enemigos()) if (en(e, c.radio)) { const d = c.dmg * m * (e.torre ? .35 : 1); herir(e, d); tot += d; } for (const e of aliados()) if (en(e, c.radio + 1.5)) e.hp = Math.min(e.max, e.hp + tot * .5); ev.efecto({ tipo: 'zona', x, y, r: c.radio, v: .8, max: .8, c: col }); ev.son('splat'); break; }
      }
    }
    function herir(e, d) {
      if (e.hp <= 0 || d <= 0 || S.fin) return;
      if (!e.torre) { const prot = S.ents.find(a => a.team === e.team && a.hp > 0 && a.hab?.tipo === 'escudo_aura' && dist(a, e) < a.hab.radio); if (prot) d *= 1 - prot.hab.red / 100; if (e.buf.red > 0) d *= .6; if (e.buf.escudo > 0) { const ab = Math.min(e.buf.escudo, d); e.buf.escudo -= ab; d -= ab; } }
      e.hp -= d; e.flash = .15;
      if (e.torre && e.rey && !e.activo) { e.activo = true; ev.voz('reyDespierta', e.team); }
      if (e.hp <= 0) morir(e);
    }
    function morir(e) {
      if (e.torre) {
        S.coronas[1 - e.team] += e.rey ? 3 - S.coronas[1 - e.team] : 1; ev.son('explosion'); ev.efecto({ tipo: 'sacudida', v: .7, max: .7 });
        ev.efecto({ tipo: 'boom', x: e.x, y: e.y, v: .9, max: .9, r: 3.2 });
        const rey = S.ents.find(x => x.torre && x.rey && x.team === e.team); if (rey) rey.activo = true;
        ev.texto(null, { equipo: e.team, a: '😱 ¡Perdimos una torre!', b: '👑 ¡Torre destruida!', tam: 1.1, dur: 1.8 }); ev.voz('torre', e.team);
        if (e.rey || S.coronas[0] >= 3 || S.coronas[1] >= 3 || S.extra) terminar();
        return;
      }
      ev.efecto({ tipo: 'muerte', x: e.x, y: e.y, team: e.team, v: .1, max: .1 }); ev.son('pop'); if (Math.random() < .3) habla(e, 'muere');
      const h = e.hab;
      if (h?.tipo === 'explota') { for (const o of S.ents) if (o.team !== e.team && o.hp > 0 && dist(o, e) < h.radio + o.r * .5) herir(o, h.dmg); ev.efecto({ tipo: 'boom', x: e.x, y: e.y, v: .5, max: .5, r: h.radio }); ev.son('explosion'); }
      if (h?.tipo === 'divide') { const mini = CARTA['_' + h.unidad]; for (let i = 0; i < h.n; i++) crearUnidad(e.team, mini, e.x + (i - (h.n - 1) / 2) * .9, e.y, 1, { nace: .2 }); }
      if (h?.tipo === 'revive' && !e.revivio) { const n = crearUnidad(e.team, e.card, e.x, e.y, 1, { revivio: 1, nace: 1.2 }); n.hp = n.max * .5; ev.efecto({ tipo: 'aparece', x: e.x, y: e.y, v: 1, max: 1, team: e.team }); ev.texto('🔥 ¡Renace!', { x: e.x, y: e.y - 1, tam: .6, dur: 1.2 }); }
      if (e.card?.id === 'glory_brown') { ev.texto('👑 Su luz nunca se apagará', { tam: .8, dur: 2.5 }); ev.efecto({ tipo: 'zona', x: e.x, y: e.y, r: 3, v: 2, max: 2, c: '#fde047' }); }
    }
    function objetivo(u) {
      let mejor = null, md = 1e9; const vista = u.hab?.tipo === 'asesino' || u.hab?.tipo === 'invisible' ? 7 : 5.5;
      const prov = S.ents.find(e => e.team !== u.team && e.hp > 0 && e.hab?.tipo === 'provoca' && dist(u, e) < e.hab.radio && !u.aire); if (prov && u.obj !== 'edif') return prov;
      for (const e of S.ents) { if (e.team === u.team || e.hp <= 0 || e.nace > 0 || e.invis) continue; if (u.obj === 'edif' && !e.torre && !e.estructura) continue; if (e.aire && !u.aAire) continue;
        const d = dist(u, e) - e.r; if (!e.torre && d > vista) continue; if (e.torre) { const mismoLado = (e.x < 9) === (u.x < 9) || e.rey; if (!mismoLado && torres(e.team).some(o => !o.rey && (o.x < 9) === (u.x < 9))) continue; }
        let pd = d + (e.torre ? 3 : 0); if (u.hab?.tipo === 'asesino' && !e.torre) pd = e.hp / 100 + d * .3; if (pd < md) { md = pd; mejor = e; } }
      return mejor;
    }
    function moverHacia(u, tx, ty, dt) {
      let px = tx, py = ty; const lado = y => y < RIO0 ? 1 : y > RIO1 ? 0 : 2;
      if (!u.aire && lado(u.y) !== lado(ty)) { const bx = Math.abs(u.x - PUENTES[0]) < Math.abs(u.x - PUENTES[1]) ? PUENTES[0] : PUENTES[1]; const ent = u.team ? RIO0 - .3 : RIO1 + .3, sal = u.team ? RIO1 + .5 : RIO0 - .5;
        if (lado(u.y) === 2 || Math.abs(u.x - bx) < .4) { px = bx; py = sal; } else { px = bx; py = ent; } }
      const lento = u.buf.lento > 0 ? .5 : 1, furia = u.buf.furia > 0 ? 1.4 : 1, dx = px - u.x, dy = py - u.y, d = Math.hypot(dx, dy) || 1, mv = Math.min(u.vel * lento * furia * dt, d);
      u.x += dx / d * mv; u.y += dy / d * mv; u.recorrido += mv; u.mueve = .15;
    }
    function habilidades(u, dt) {
      const h = u.hab; if (!h) return;
      if (h.tipo === 'cura' || h.tipo === 'invoca') { u.habT -= dt; if (u.habT > 0) return; u.habT = h.cada;
        if (h.tipo === 'cura') { let alguien = false; for (const a of S.ents) if (a.team === u.team && a.hp > 0 && !a.torre && a !== u && dist(a, u) < h.radio && a.hp < a.max) { a.hp = Math.min(a.max, a.hp + h.valor); alguien = true; } if (alguien) ev.efecto({ tipo: 'curar', x: u.x, y: u.y, r: h.radio, v: .8, max: .8 }); }
        else { const mini = CARTA['_' + h.unidad]; for (let i = 0; i < h.n; i++) crearUnidad(u.team, mini, u.x + (Math.random() - .5) * 1.4, u.y + (u.team ? 1 : -1) * (u.r + .5), 1, { nace: .3 }); ev.efecto({ tipo: 'onda', x: u.x, y: u.y, r: 1.2, v: .4, max: .4, c: '#a855f7' }); } }
      if (h.tipo === 'carga' && u.recorrido > 2.5) u.cargado = 1;
      if (h.tipo === 'reina') { const R = u.rt, aliados = () => S.ents.filter(a => a.team === u.team && a.hp > 0 && !a.torre);
        for (const kk in R) R[kk] -= dt;
        if (R.luz <= 0) { R.luz = h.luz.cada; let n = 0; for (const a of aliados()) if (dist(a, u) < h.luz.radio) { a.hp = Math.min(a.max, a.hp + h.luz.valor); a.buf.dot = null; a.buf.lento = 0; a.buf.aturdido = 0; n++; } ev.efecto({ tipo: 'curar', x: u.x, y: u.y, r: h.luz.radio, v: 1, max: 1, oro: 1 }); if (n > 1) habla(u, 'luz', 0, true); }
        if (R.rayo <= 0) { const obj = objetivo(u); if (obj) { R.rayo = h.rayo.cada; const a = Math.atan2(obj.y - u.y, obj.x - u.x); for (const e of S.ents) if (e.team !== u.team && e.hp > 0) { const rx = e.x - u.x, ry = e.y - u.y, along = rx * Math.cos(a) + ry * Math.sin(a), perp = Math.abs(-rx * Math.sin(a) + ry * Math.cos(a)); if (along > 0 && along < h.rayo.largo && perp < h.rayo.ancho + e.r * .5) herir(e, h.rayo.dmg * (e.torre ? .5 : 1)); } ev.efecto({ tipo: 'rayoD', x: u.x, y: u.y, x2: u.x + Math.cos(a) * h.rayo.largo, y2: u.y + Math.sin(a) * h.rayo.largo, v: .6, max: .6 }); ev.son('explosion'); habla(u, 'rayo', 0, true); } }
        if (R.escudo <= 0) { R.escudo = h.escudo.cada; for (const a of aliados()) if (dist(a, u) < h.escudo.radio) a.buf.red = h.escudo.dur; ev.efecto({ tipo: 'escudo', x: u.x, y: u.y, r: h.escudo.radio, v: 1.2, max: 1.2 }); ev.son('nivel'); habla(u, 'escudo', 0, true); }
        if (R.corazon <= 0) { R.corazon = h.corazon.cada; for (const a of aliados()) if (dist(a, u) < h.corazon.radio) { a.buf.furia = h.corazon.dur; a.hp = Math.min(a.max, a.hp + a.max * .1); } ev.efecto({ tipo: 'corazon', x: u.x, y: u.y, r: h.corazon.radio, v: 1.6, max: 1.6 }); ev.texto('❤️ ¡CORAZÓN DE ABUELITA!', { x: u.x, y: u.y - 1.5, tam: .7, dur: 2 }); ev.son('combo'); ev.efecto({ tipo: 'confeti', v: .1, max: .1 }); habla(u, 'corazon', 0, true); } }
    }
    function atacar(u, tg) {
      if (u.proy || u.torre) { S.proys.push({ x: u.x, y: u.y - (u.torre ? u.r : 0), tgt: tg, tx: tg.x, ty: tg.y, v: u.torre ? 14 : 11, dmg: u.dmg, area: u.area, tipo: u.torre ? 'flecha' : u.proy, team: u.team, de: u }); if (!u.torre) ev.son(u.card?.sfx?.ataque || 'swish'); }
      else { impacto(u, tg, u.dmg * (u.cargado ? 2 : 1), u.area, 'golpe'); if (u.cargado) { u.cargado = 0; u.recorrido = 0; ev.efecto({ tipo: 'onda', x: tg.x, y: tg.y, r: 1.2, v: .4, max: .4, c: '#fde047' }); } ev.efecto({ tipo: 'golpe', x: (u.x + tg.x) / 2, y: (u.y + tg.y) / 2, v: .2, max: .2 }); ev.son(tg.torre ? 'choque' : 'splat'); }
    }
    function impacto(u, tg, dmg, area, tipo) {
      const team = u ? u.team : 1 - tg.team, lista = area ? S.ents.filter(e => e.team !== team && e.hp > 0 && dist(e, tg) < area + e.r * .5) : [tg];
      if (area) ev.efecto({ tipo: 'boom', x: tg.x, y: tg.y, v: .35, max: .35, r: area, c: tipo === 'magia' || tipo === 'luz' ? '#c4b5fd' : tipo === 'hielo' ? '#bae6fd' : tipo === 'espina' ? '#a3e635' : null });
      const h = u?.hab;
      for (const e of lista) { herir(e, dmg); if (!h || e.torre) continue;
        if (h.tipo === 'veneno' || h.tipo === 'quema') e.buf.dot = { dps: h.dps, hasta: h.dur };
        if (h.tipo === 'congela') e.buf.lento = h.dur; if (h.tipo === 'aturde') e.buf.aturdido = h.dur;
        if (h.tipo === 'empuje') { const a = Math.atan2(e.y - u.y, e.x - u.x); e.x += Math.cos(a) * .8; e.y += Math.sin(a) * .8; } }
      if (h?.tipo === 'robo' && u.hp > 0) u.hp = Math.min(u.max, u.hp + dmg * h.pct / 100);
      if (h?.tipo === 'cadena') { let prev = tg; const vistos = new Set([tg]); for (let i = 0; i < h.saltos; i++) { const sig = S.ents.filter(e => e.team !== team && e.hp > 0 && !vistos.has(e) && dist(e, prev) < 4).sort((a, b) => dist(a, prev) - dist(b, prev))[0]; if (!sig) break; vistos.add(sig); herir(sig, dmg * .7); ev.efecto({ tipo: 'cadena', x: prev.x, y: prev.y, x2: sig.x, y2: sig.y, v: .3, max: .3 }); prev = sig; } }
      if (tipo !== 'golpe') ev.son('splat');
    }
    // Valida y juega una carta: maná suficiente, carta en la mano y lado correcto del río.
    function jugarCarta(as, key, x, y) {
      x = +x; y = +y; const C = CARTA[key]; if (!as || !C || !Number.isFinite(x) || !Number.isFinite(y) || !as.mano.includes(key) || as.mana < C.c || S.fin) return false;
      if (C.tipo !== 'hechizo') { const propio = as.team ? y <= RIO0 - .3 : y >= RIO1 + .3, bolsillo = C.tipo === 'tropa' && !torres(1 - as.team).some(o => !o.rey && (o.x < 9) === (x < 9)) && (as.team ? y <= 23 : y >= 9); if (!propio && !bolsillo) return false; }
      as.mana -= C.c; as.mano.splice(as.mano.indexOf(key), 1); as.mano.push(as.cola.shift()); as.cola.push(key);
      desplegar(as, key, Math.max(.5, Math.min(AN - .5, x)), Math.max(.5, Math.min(AL - .5, y))); return true;
    }
    function ia(as, dt) {
      as.iaT -= dt; if (as.iaT > 0) return; as.iaT = Math.max(.4, 1.1 - arenaI * .03) + Math.random() * .5 + (n4 ? .5 : 0);
      const Y = y => as.team ? y : AL - y, rel = e => as.team ? e.y : AL - e.y, enemigo = 1 - as.team, C = id => CARTA[id];
      const jugar = (key, x, yr) => jugarCarta(as, key, x, Y(C(key).tipo === 'hechizo' ? yr : Math.min(RIO0 - .5, yr)));
      const amenazas = S.ents.filter(e => e.team === enemigo && e.hp > 0 && !e.torre && !e.invis && rel(e) < 21);
      const hech = as.mano.filter(c => C(c).tipo === 'hechizo' && C(c).c <= as.mana && ['bola', 'meteoro', 'rayo', 'veneno', 'congelar', 'linea', 'tornado', 'drenar'].includes(C(c).arq));
      if (hech.length) { const g = S.ents.filter(e => e.team === enemigo && !e.torre && e.hp > 0); for (const e of g) { const cerca = g.filter(o => dist(o, e) < 2.4); if (cerca.length >= 3 || cerca.reduce((a, o) => a + o.hp, 0) > 1100) { const cx = cerca.reduce((a, o) => a + o.x, 0) / cerca.length, cy = cerca.reduce((a, o) => a + o.y, 0) / cerca.length; jugarCarta(as, hech[0], cx, cy); return; } } }
      if (amenazas.length) {
        const a = amenazas.sort((p, q) => rel(p) - rel(q))[0], volador = a.aire, enjambre = amenazas.filter(o => dist(o, a) < 2.5).length >= 3;
        const def = as.mano.filter(c => C(c).tipo !== 'hechizo' && C(c).c <= as.mana && C(c).obj !== 'edif' && C(c).dmg > 0 && (!volador || C(c).aAire)).sort((p, q) => (enjambre ? (C(q).area ? 1 : 0) - (C(p).area ? 1 : 0) : 0) || C(q).hp - C(p).hp);
        if (def.length && rel(a) < 18) { const c = def[0], est = C(c).tipo === 'estructura'; jugar(c, est ? 9 + (a.x < 9 ? -1.5 : 1.5) : Math.max(1, Math.min(AN - 1, a.x + (Math.random() - .5) * 2)), est ? 10.5 : Math.max(1.5, Math.min(RIO0 - .5, rel(a) - (C(c).rango > 2 ? 4 : 2)))); return; }
      }
      if (as.mana >= 8.5 || (as.mana >= 6 && Math.random() < .25)) {
        const lado = (() => { const ts = torres(enemigo).filter(e => !e.rey); if (!ts.length) return Math.random() < .5 ? 0 : 1; return ts.sort((p, q) => p.hp - q.hp)[0].x < 9 ? 0 : 1; })(), bx = PUENTES[n4 && as.a % 2 ? 1 - lado : lado];
        const propios = S.ents.filter(e => e.team === as.team && !e.torre && !e.estructura && e.hp > 0 && Math.abs(e.x - bx) < 4);
        const tanque = as.mano.find(c => ['gigante', 'golem', 'titan', 'jinete', 'reina'].includes(C(c).arq) && C(c).c <= as.mana);
        if (tanque && !propios.length) { jugar(tanque, bx + (Math.random() - .5), ['golem', 'titan', 'gigante'].includes(C(tanque).arq) ? 4 : RIO0 - 1); return; }
        const apoyo = as.mano.find(c => C(c).tipo === 'tropa' && C(c).c <= as.mana && !['golem', 'titan'].includes(C(c).arq)) || as.mano.find(c => C(c).tipo === 'estructura' && C(c).c <= as.mana);
        if (apoyo) { const t0 = propios[0]; if (C(apoyo).tipo === 'estructura') jugar(apoyo, 9 + (Math.random() - .5) * 4, C(apoyo).arq === 'mortero' || C(apoyo).arq === 'generador' ? 4 : 10); else jugar(apoyo, t0 ? t0.x : bx, t0 ? rel(t0) - 2 : RIO0 - 2); }
      }
    }
    function terminar(ganador) {
      if (S.fin) return; S.fin = true;
      if (ganador === undefined) { ganador = S.coronas[0] > S.coronas[1] ? 0 : S.coronas[1] > S.coronas[0] ? 1 : null; if (ganador === null) { const pct = tm => torres(tm).reduce((a, e) => Math.min(a, e.hp / e.max), 1); ganador = pct(0) > pct(1) ? 0 : pct(0) < pct(1) ? 1 : null; } }
      S.ganador = ganador; ev.fin(ganador, S.coronas);
    }
    function paso(dt) {
      if (S.fin) return; S.tiempo -= dt; const doble = S.tiempo <= B.dobleDesde || S.extra;
      for (const as of S.asientos) as.mana = Math.min(B.manaMax, as.mana + dt / B.regen * (doble ? 2 : 1) * (n4 ? .8 : 1) * (as.bonus || 1));
      if (S.tiempo <= 0) { if (!S.extra && S.coronas[0] === S.coronas[1]) { S.extra = true; S.tiempo = B.extra; ev.texto('⏱️ ¡Tiempo extra! La siguiente torre gana', { tam: .8, dur: 2.2 }); ev.son('sirena'); ev.voz('extra'); } else return terminar(); }
      if (!S.extra && S.tiempo <= B.dobleDesde && S.tiempo + dt > B.dobleDesde) { ev.texto('💜 ¡Elixir doble!', { tam: 1, dur: 1.8 }); ev.son('combo'); ev.voz('doble'); }
      for (const z of S.zonas) { z.tick -= dt; if (z.tick > 0) continue; z.tick = .5;
        for (const e of S.ents) { if (e.hp <= 0 || Math.hypot(e.x - z.x, e.y - z.y) > z.radio + (e.torre ? e.r : 0)) continue;
          if (z.tipo === 'cura' && e.team === z.team && !e.torre) e.hp = Math.min(e.max, e.hp + z.valor * .5);
          if (z.tipo === 'veneno' && e.team !== z.team) { herir(e, z.valor * .5 * (e.torre ? .35 : 1)); if (!e.torre) e.buf.lento = .6; }
          if (z.tipo === 'furia' && e.team === z.team && !e.torre) e.buf.furia = .6;
          if (z.tipo === 'tornado' && e.team !== z.team && !e.torre) { const a = Math.atan2(z.y - e.y, z.x - e.x); e.x += Math.cos(a) * .5; e.y += Math.sin(a) * .5; herir(e, z.valor * .25); } } }
      S.zonas = S.zonas.filter(z => S.tiempo > z.hasta);
      for (const u of S.ents) {
        if (u.hp <= 0) continue; u.t = (u.t || 0) + dt; u.flash = Math.max(0, (u.flash || 0) - dt); u.at = Math.max(0, (u.at || 0) - dt); u.mueve = Math.max(0, (u.mueve || 0) - dt);
        const bf = u.buf; for (const kk of ['lento', 'furia', 'red', 'aturdido', 'escudoT']) if (bf[kk] > 0) bf[kk] -= dt; if (!(bf.escudoT > 0)) bf.escudo = 0;
        if (bf.dot && bf.dot.hasta > 0) { bf.dot.hasta -= dt; herir(u, bf.dot.dps * dt); if (u.hp <= 0) continue; }
        if (u.estructura) { u.hp -= u.max / u.vida * dt; if (u.hp <= 0) { morir(u); continue; } }
        if (u.nace > 0) { u.nace -= dt; if (u.nace <= 0 && u.hab?.tipo === 'rugido') { for (const o of S.ents) if (o.team !== u.team && o.hp > 0 && !o.torre && dist(o, u) < u.hab.radio) o.buf.aturdido = u.hab.dur; ev.efecto({ tipo: 'onda', x: u.x, y: u.y, r: u.hab.radio, v: .6, max: .6, c: '#fde047' }); ev.son('jefe'); } continue; }
        if (bf.aturdido > 0) continue;
        if (u.torre && !u.activo) continue;
        habilidades(u, dt);
        if (!u.dmg || u.golpe >= 99) continue;
        if (!u.tgt || u.tgt.hp <= 0 || u.tgt.invis || (!u.torre && !u.tgt.torre && dist(u, u.tgt) > 7.5) || ((u.torre || u.estructura) && dist(u, u.tgt) - u.tgt.r > u.rango)) {
          const ant = u.tgt; u.tgt = (u.torre || u.estructura) ? (() => { let m = null, md = 1e9; for (const e of S.ents) if (e.team !== u.team && e.hp > 0 && !e.torre && !(e.nace > 0) && !e.invis && (!e.aire || u.aAire)) { const d = dist(u, e) - e.r; if (d <= u.rango && d < md && !(u.card?.arq === 'mortero' && d < 3.5)) { md = d; m = e; } } return m; })() : objetivo(u);
          if (u.tgt && u.tgt !== ant && !u.tgt.torre && u.card?.frases && u.tgt.card?.frases && S.charlaT <= 0) { S.charlaT = 4 + Math.random() * 3; const a1 = u, el = u.tgt; habla(a1, 'ataque'); setTimeout(() => { if (el.hp > 0 && a1.hp > 0) habla(el, 'resp', null, true); }, 1400); }
        }
        const tg = u.tgt; if (!tg) continue;
        const d = dist(u, tg) - tg.r - (u.torre ? 0 : u.r * .3);
        if (d <= u.rango) { u.cd -= dt * (bf.furia > 0 ? 1.4 : 1); if (u.cd <= 0) { u.cd = u.golpe; u.at = .25; if (u.invis) u.invis = 0; atacar(u, tg); } }
        else if (!u.torre && !u.estructura) { u.cd = Math.min(u.cd, u.golpe * .5); moverHacia(u, tg.x, tg.y, dt); }
      }
      S.charlaT -= dt;
      const vivos = S.ents.filter(e => e.hp > 0);
      for (let i = 0; i < vivos.length; i++) for (let j = i + 1; j < vivos.length; j++) { const a = vivos[i], b = vivos[j]; if (!!a.aire !== !!b.aire || (a.torre && b.torre)) continue; const fa = a.torre || a.estructura, fb = b.torre || b.estructura; if (fa && fb) continue; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, m = (a.r + b.r) * .85; if (d < m) { const p = (m - d) / 2, nx = dx / d, ny = dy / d; if (fa) { b.x += nx * p * 2; b.y += ny * p * 2; } else if (fb) { a.x -= nx * p * 2; a.y -= ny * p * 2; } else { a.x -= nx * p; a.y -= ny * p; b.x += nx * p; b.y += ny * p; } } }
      for (const u of vivos) if (!u.torre && !u.estructura) { u.x = Math.max(.4, Math.min(AN - .4, u.x)); u.y = Math.max(.4, Math.min(AL - .4, u.y)); if (!u.aire && u.y > RIO0 - .1 && u.y < RIO1 + .1) { const bx = Math.abs(u.x - PUENTES[0]) < Math.abs(u.x - PUENTES[1]) ? PUENTES[0] : PUENTES[1]; u.x = Math.max(bx - 1, Math.min(bx + 1, u.x)); } }
      for (const p of S.proys) {
        if (p.tipo === 'bola') { const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy); if (d < p.v * dt) { p.fin = 1; for (const e of S.ents) if (e.team !== p.team && e.hp > 0 && Math.hypot(e.x - p.tx, e.y - p.ty) < p.radio + (e.torre ? e.r : 0)) herir(e, e.torre ? p.dmg * .35 : p.dmg); ev.efecto({ tipo: 'boom', x: p.tx, y: p.ty, v: .7, max: .7, r: p.radio }); ev.son('explosion'); ev.efecto({ tipo: 'sacudida', v: p.grande ? .7 : .35, max: .7 }); } else { p.x += dx / d * p.v * dt; p.y += dy / d * p.v * dt; } continue; }
        const tg = p.tgt; if (!tg || tg.hp <= 0) { p.fin = 1; continue; } const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy); p.tx = tg.x; p.ty = tg.y;
        if (d < p.v * dt + .2) { p.fin = 1; impacto(p.de, tg, p.dmg, p.area, p.tipo); } else { p.x += dx / d * p.v * dt; p.y += dy / d * p.v * dt; }
      }
      S.proys = S.proys.filter(p => !p.fin); S.ents = S.ents.filter(e => e.hp > 0 || e.torre);
      for (const as of S.asientos) if (as.ctrl === 'ia') ia(as, dt);
      S.iaEmoT -= dt; if (S.iaEmoT <= 0) { S.iaEmoT = 14 + Math.random() * 15; const bot = S.asientos.find(a => a.ctrl === 'ia'); if (bot && Math.random() < .5) ev.emote(bot.a, azar(['😂', '😡', '👍', '😭', '😎'])); }
    }
    // Estado compacto para enviar por la red (lo dibujan los celulares)
    function foto(nuevos) {
      return { t: r1(S.tiempo), x: S.extra ? 1 : 0, c: S.coronas, e: S.ents.map(e => [e.id, e.team, e.torre ? (e.rey ? 'R' : 'T') : e.cid, r1(e.x), r1(e.y), Math.round(e.hp), Math.round(e.max), (e.buf.aturdido > 0 ? 1 : 0) | (e.nace > 0 ? 2 : 0) | (e.at > 0 ? 4 : 0) | (e.activo ? 8 : 0) | (e.flash > 0 ? 16 : 0) | (e.invis ? 32 : 0) | (e.buf.lento > 0 ? 64 : 0) | (e.buf.red > 0 || e.buf.escudo > 0 ? 128 : 0) | (e.buf.furia > 0 ? 256 : 0) | (e.mueve > 0 ? 512 : 0)]),
        p: S.proys.map(p => [p.tipo, r1(p.x), r1(p.y), r1(p.tx ?? p.x), r1(p.ty ?? p.y)]), z: S.zonas.map(z => [z.tipo, r1(z.x), r1(z.y), z.radio, z.col]), s: S.asientos.map(a => [r1(a.mana), a.mano, a.cola[0]]), ...(nuevos || {}) };
    }
    return { S, paso, jugar: (a, key, x, y) => jugarCarta(S.asientos[a], key, x, y), desplegar: (a, key, x, y) => desplegar(S.asientos[a], key, x, y), terminar, foto, torres };
  }
  const API = { crear, mult, AN, AL, RIO0, RIO1, PUENTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GloryMotor = API;
})(typeof window !== 'undefined' ? window : globalThis);
