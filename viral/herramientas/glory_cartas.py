# Genera public/glory/cartas.js: catálogo central de GLORY BROWN (127 cartas, 7 mundos, 21 arenas).
# Todos los valores de combate salen de aquí: para balancear se edita este archivo y se vuelve a ejecutar.
import json, os, random, re
BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'glory')
os.makedirs(BASE, exist_ok=True)

RAREZAS = {'comun': ('Común', 1.0, 0, '#9ca3af'), 'rara': ('Rara', 1.08, 0, '#f59e0b'), 'epica': ('Épica', 1.16, 0, '#a855f7'),
           'legendaria': ('Legendaria', 1.25, 1, '#22d3ee'), 'mitica': ('Mítica', 1.35, 1, '#f43f5e'), 'suprema': ('Suprema', 1.5, 2, '#facc15'),
           'real': ('Legendaria Real', 1.0, 0, '#fde047')}

MUNDOS = [
  dict(id='alba', n='Reino del Alba', e='🏰', d='Castillos dorados, caballeros y criaturas de luz.', pal=['#facc15', '#fff7d6', '#b45309'], vozMundo='¡La luz del alba te derrotará!'),
  dict(id='bosque', n='Bosque Esmeralda', e='🌳', d='Bosques encantados, elfos, druidas y bestias.', pal=['#22c55e', '#bbf7d0', '#14532d'], vozMundo='¡El bosque entero te atrapará!'),
  dict(id='arenas', n='Imperio de las Arenas', e='🏜️', d='Desiertos, templos antiguos y magia ancestral.', pal=['#f59e0b', '#fde68a', '#92400e'], vozMundo='¡Las arenas serán tu tumba!'),
  dict(id='cielo', n='Islas Celestiales', e='☁️', d='Islas flotantes, ángeles guerreros y dragones del cielo.', pal=['#38bdf8', '#e0f2fe', '#1e3a8a'], vozMundo='¡Los cielos están de mi lado!'),
  dict(id='sombras', n='Reino de las Sombras', e='🌑', d='Fortalezas oscuras, espectros y necromantes.', pal=['#a855f7', '#e9d5ff', '#1e1b4b'], vozMundo='¡La oscuridad te consumirá!'),
  dict(id='hielo', n='Dominio de Hielo', e='❄️', d='Castillos congelados, lobos de hielo y gigantes.', pal=['#67e8f9', '#ecfeff', '#164e63'], vozMundo='¡Te congelaré hasta los huesos!'),
  dict(id='dragon', n='Reino del Dragón', e='🐉', d='Volcanes, dragones legendarios y titanes.', pal=['#ef4444', '#fecaca', '#450a0a'], vozMundo='¡Arderás en mis llamas!'),
]
ARENAS = [('Campos del Alba', 0), ('Castillo Dorado', 150), ('Ciudadela del Sol', 300),
          ('Claro de los Elfos', 450), ('Raíces Ancestrales', 600), ('Corazón Esmeralda', 800),
          ('Oasis Perdido', 1000), ('Templo del Sol', 1200), ('Pirámide Eterna', 1400),
          ('Puerto de las Nubes', 1600), ('Jardines Flotantes', 1850), ('Trono del Cielo', 2100),
          ('Cementerio Olvidado', 2350), ('Fortaleza Sombría', 2600), ('Abismo Eterno', 2900),
          ('Lago Congelado', 3200), ('Picos de Cristal', 3500), ('Palacio Glacial', 3800),
          ('Forja Volcánica', 4200), ('Nido de Dragones', 4600), ('Arena Legendaria de Glory Brown', 5000)]

# Arquetipos: estadísticas base (coste, vida, daño, seg. entre golpes, alcance, velocidad, cantidad, radio)
ARQ = {
  'caballero': dict(c=3, hp=1150, dmg=130, golpe=1.2, rango=1.1, vel=1.0, cant=1, r=.6, obj='todo', proy=None),
  'guerrero':  dict(c=4, hp=1000, dmg=185, golpe=1.4, rango=1.1, vel=1.0, cant=1, r=.62, obj='todo', area=.9),
  'lanceros':  dict(c=3, hp=360, dmg=90, golpe=1.1, rango=1.5, vel=1.1, cant=3, r=.45, obj='todo'),
  'arquero':   dict(c=3, hp=300, dmg=85, golpe=1.0, rango=5, vel=1.0, cant=2, r=.45, obj='todo', aAire=1, proy='flecha'),
  'mago':      dict(c=4, hp=560, dmg=150, golpe=1.5, rango=5, vel=1.0, cant=1, r=.55, obj='todo', aAire=1, area=1.3, proy='magia'),
  'sanador':   dict(c=4, hp=680, dmg=60, golpe=1.2, rango=4, vel=1.0, cant=1, r=.55, obj='todo', aAire=1, proy='magia'),
  'asesino':   dict(c=4, hp=650, dmg=255, golpe=1.0, rango=1, vel=1.6, cant=1, r=.55, obj='todo'),
  'gigante':   dict(c=5, hp=3200, dmg=170, golpe=1.5, rango=1.2, vel=.65, cant=1, r=.95, obj='edif'),
  'golem':     dict(c=7, hp=4300, dmg=230, golpe=2.2, rango=1.2, vel=.55, cant=1, r=1.05, obj='edif'),
  'titan':     dict(c=8, hp=5000, dmg=300, golpe=1.8, rango=1.3, vel=.6, cant=1, r=1.15, obj='todo', area=1.6),
  'bestia':    dict(c=3, hp=540, dmg=115, golpe=.9, rango=.9, vel=1.75, cant=1, r=.55, obj='todo'),
  'manada':    dict(c=3, hp=230, dmg=70, golpe=.9, rango=.9, vel=1.8, cant=3, r=.45, obj='todo'),
  'enjambre':  dict(c=2, hp=110, dmg=55, golpe=1.0, rango=.8, vel=1.4, cant=4, r=.32, obj='todo'),
  'enjambre_aire': dict(c=3, hp=90, dmg=50, golpe=.8, rango=.8, vel=1.9, cant=5, r=.3, obj='todo', aire=1, aAire=1),
  'volador':   dict(c=4, hp=800, dmg=110, golpe=1.5, rango=3.2, vel=1.3, cant=1, r=.65, obj='todo', aire=1, aAire=1, area=1.0, proy='fuego'),
  'espectro':  dict(c=3, hp=430, dmg=140, golpe=1.1, rango=1, vel=1.5, cant=1, r=.5, obj='todo', aire=1, aAire=1),
  'jinete':    dict(c=4, hp=900, dmg=200, golpe=1.5, rango=1.1, vel=1.9, cant=1, r=.62, obj='edif'),
  'invocador': dict(c=5, hp=900, dmg=90, golpe=1.4, rango=4.5, vel=.9, cant=1, r=.6, obj='todo', aAire=1, proy='magia'),
  # estructuras (vel 0, se desgastan con el tiempo)
  'torre':     dict(c=4, hp=1100, dmg=95, golpe=.9, rango=6.5, vel=0, cant=1, r=.85, obj='todo', aAire=1, proy='flecha', dur=35),
  'canon':     dict(c=3, hp=800, dmg=150, golpe=1.0, rango=5.5, vel=0, cant=1, r=.85, obj='todo', proy='bala', dur=30),
  'mortero':   dict(c=4, hp=1000, dmg=230, golpe=4, rango=11.5, vel=0, cant=1, r=.85, obj='todo', area=1.6, proy='roca', dur=30),
  'generador': dict(c=5, hp=1000, dmg=0, golpe=99, rango=0, vel=0, cant=1, r=.95, obj='todo', dur=40),
  'muro':      dict(c=2, hp=1900, dmg=0, golpe=99, rango=0, vel=0, cant=1, r=.9, obj='todo', dur=25),
}
HECHIZOS = {
  'bola': dict(c=4, radio=2.5, dmg=380), 'meteoro': dict(c=6, radio=3, dmg=720, retraso=1.2), 'congelar': dict(c=3, radio=3, dmg=90, dur=4),
  'rayo': dict(c=6, radio=3.5, dmg=820, objetivos=3), 'linea': dict(c=4, ancho=1.2, largo=9, dmg=330), 'cura': dict(c=3, radio=3, valor=130, dur=4),
  'veneno': dict(c=4, radio=3, dmg=85, dur=8), 'furia': dict(c=3, radio=4, dur=8, pct=40), 'tornado': dict(c=3, radio=4, dmg=60, dur=2),
  'empuje': dict(c=2, radio=3, dmg=150), 'escudo': dict(c=3, radio=3.5, valor=400, dur=8), 'invoca': dict(c=3, radio=1.5, unidad='esbirro', cantidad=4),
  'drenar': dict(c=4, radio=2.5, dmg=250),
}
# Mundo -> lista de (nombre, arquetipo o hechizo, rareza, género voz, extras)
L = {
 'alba': [
  ('Escudero del Alba', 'caballero', 'comun', 'M', {}), ('Arqueras del Sol', 'arquero', 'comun', 'F', {}), ('Lanceros Dorados', 'lanceros', 'comun', 'M', {}),
  ('Hadas del Alba', 'enjambre_aire', 'comun', 'F', {'aspecto': 'hada'}), ('Paladín Radiante', 'caballero', 'rara', 'M', {'hab': {'tipo': 'escudo_aura', 'radio': 2.5, 'red': 25}}),
  ('Clériga de la Aurora', 'sanador', 'rara', 'F', {'hab': {'tipo': 'cura', 'radio': 3, 'valor': 90, 'cada': 2}}), ('Gigante de Bronce', 'gigante', 'rara', 'M', {}),
  ('Jinete del Amanecer', 'jinete', 'rara', 'M', {'hab': {'tipo': 'carga'}, 'aspecto': 'caballo'}), ('Grifo Real', 'volador', 'epica', 'M', {'aspecto': 'grifo', 'proy': 'pluma', 'area': 0}),
  ('Mago de Luz', 'mago', 'epica', 'M', {'proy': 'luz'}), ('León Dorado', 'bestia', 'epica', 'M', {'aspecto': 'leon', 'hab': {'tipo': 'rugido', 'radio': 3, 'dur': 1}}),
  ('Centinela Solar', 'golem', 'legendaria', 'M', {'hab': {'tipo': 'escudo_aura', 'radio': 3, 'red': 30}}), ('Titán del Alba', 'titan', 'mitica', 'M', {'hab': {'tipo': 'rugido', 'radio': 3.5, 'dur': 1.2}}),
  ('Lluvia de Luz', 'bola', 'comun', 'F', {'color': '#fde047'}), ('Bendición Dorada', 'cura', 'rara', 'F', {}), ('Flecha Celestial', 'linea', 'epica', 'M', {'color': '#fef08a'}),
  ('Torre del Vigía', 'torre', 'comun', 'M', {}), ('Balista Real', 'canon', 'rara', 'M', {'proy': 'virote'})],
 'bosque': [
  ('Guardabosques Elfo', 'arquero', 'comun', 'M', {'cant': 1, 'hp': 1.6, 'dmg': 1.4}), ('Lobos Esmeralda', 'manada', 'comun', 'M', {'aspecto': 'lobo'}), ('Duendes Traviesos', 'enjambre', 'comun', 'M', {'aspecto': 'duende'}),
  ('Hongos Saltarines', 'enjambre', 'comun', 'M', {'aspecto': 'hongo', 'cant': 3, 'hab': {'tipo': 'explota', 'radio': 1.5, 'dmg': 120}}), ('Druida del Roble', 'sanador', 'rara', 'M', {'hab': {'tipo': 'cura', 'radio': 3, 'valor': 85, 'cada': 2}}),
  ('Oso Guardián', 'caballero', 'rara', 'M', {'aspecto': 'oso', 'hp': 1.2}), ('Ciervo Místico', 'jinete', 'rara', 'F', {'aspecto': 'ciervo', 'hab': {'tipo': 'carga'}}),
  ('Búho Sabio', 'volador', 'rara', 'M', {'aspecto': 'buho', 'proy': 'pluma', 'area': 0, 'c': 3, 'hp': .7}), ('Pantera Sombra Verde', 'asesino', 'epica', 'F', {'aspecto': 'pantera', 'hab': {'tipo': 'invisible'}}),
  ('Hechicera de Espinas', 'mago', 'epica', 'F', {'hab': {'tipo': 'veneno', 'dps': 30, 'dur': 4}, 'proy': 'espina'}), ('Ent Ancestral', 'gigante', 'epica', 'M', {'aspecto': 'ent'}),
  ('Dríada Reina', 'invocador', 'legendaria', 'F', {'hab': {'tipo': 'invoca', 'unidad': 'brote', 'n': 2, 'cada': 7}}), ('Gran Ent Primordial', 'titan', 'mitica', 'M', {'aspecto': 'ent'}),
  ('Enredadera', 'congelar', 'comun', 'F', {'color': '#22c55e', 'texto': 'Atrapa a los enemigos con raíces.'}), ('Esporas Venenosas', 'veneno', 'rara', 'M', {'color': '#84cc16'}), ('Brote Sanador', 'cura', 'epica', 'F', {'color': '#4ade80'}),
  ('Árbol Arquero', 'torre', 'rara', 'M', {'aspecto': 'arbol'}), ('Choza de Duendes', 'generador', 'rara', 'M', {'hab': {'tipo': 'invoca', 'unidad': 'duende', 'n': 1, 'cada': 5}})],
 'arenas': [
  ('Guerrero del Sol', 'guerrero', 'comun', 'M', {}), ('Arqueros Nómadas', 'arquero', 'comun', 'M', {}), ('Escarabajos Dorados', 'enjambre', 'comun', 'M', {'aspecto': 'escarabajo', 'cant': 5, 'hp': .8}),
  ('Momia Guardiana', 'caballero', 'comun', 'M', {'aspecto': 'momia'}), ('Escorpión Gigante', 'bestia', 'rara', 'M', {'aspecto': 'escorpion', 'hp': 1.6, 'vel': .75, 'hab': {'tipo': 'veneno', 'dps': 35, 'dur': 4}}),
  ('Jinete del Camello', 'jinete', 'rara', 'M', {'aspecto': 'camello', 'hab': {'tipo': 'carga'}}), ('Sacerdotisa Solar', 'sanador', 'rara', 'F', {'hab': {'tipo': 'cura', 'radio': 3, 'valor': 95, 'cada': 2}}),
  ('Guardián de Piedra', 'gigante', 'epica', 'M', {'aspecto': 'piedra'}), ('Djinn del Viento', 'volador', 'epica', 'M', {'aspecto': 'djinn', 'proy': 'viento'}),
  ('Asesino de las Dunas', 'asesino', 'epica', 'M', {'hab': {'tipo': 'invisible'}}), ('Esfinge Antigua', 'golem', 'legendaria', 'F', {'aspecto': 'esfinge', 'hab': {'tipo': 'rugido', 'radio': 3, 'dur': 1}}),
  ('Faraón Eterno', 'invocador', 'legendaria', 'M', {'hab': {'tipo': 'invoca', 'unidad': 'momiita', 'n': 2, 'cada': 7}}), ('Titán de Arena', 'titan', 'mitica', 'M', {'aspecto': 'piedra'}),
  ('Tormenta de Arena', 'tornado', 'comun', 'M', {'color': '#fbbf24'}), ('Sol Abrasador', 'bola', 'rara', 'M', {'color': '#fb923c'}), ('Maldición Antigua', 'veneno', 'epica', 'F', {'color': '#a3e635'}),
  ('Obelisco Solar', 'torre', 'rara', 'M', {'aspecto': 'obelisco', 'proy': 'luz'}), ('Catapulta del Desierto', 'mortero', 'epica', 'M', {})],
 'cielo': [
  ('Ángel Guerrero', 'espectro', 'comun', 'F', {'aspecto': 'angel', 'hp': 1.3}), ('Arquera Celeste', 'arquero', 'comun', 'F', {'cant': 1, 'hp': 1.6, 'dmg': 1.5}), ('Espíritus del Cielo', 'enjambre_aire', 'comun', 'F', {'aspecto': 'espiritu'}),
  ('Guardián de las Nubes', 'caballero', 'comun', 'M', {}), ('Grifos del Viento', 'volador', 'rara', 'M', {'aspecto': 'grifo', 'cant': 2, 'hp': .55, 'dmg': .6, 'proy': 'pluma', 'area': 0}),
  ('Mago del Viento', 'mago', 'rara', 'M', {'proy': 'viento', 'hab': {'tipo': 'empuje'}}), ('Pegaso Veloz', 'jinete', 'rara', 'F', {'aspecto': 'pegaso', 'aire': 1, 'hab': {'tipo': 'carga'}}),
  ('Gigante de las Nubes', 'gigante', 'epica', 'M', {'aspecto': 'nube'}), ('Monje del Trueno', 'mago', 'epica', 'M', {'proy': 'rayo', 'area': 0, 'hab': {'tipo': 'cadena', 'saltos': 3}}),
  ('Valquiria Alada', 'guerrero', 'epica', 'F', {'aspecto': 'angel', 'aire': 1, 'aAire': 1}), ('Dragón Celeste', 'volador', 'legendaria', 'M', {'aspecto': 'dragon', 'proy': 'rayo', 'hab': {'tipo': 'cadena', 'saltos': 2}}),
  ('Serafín', 'sanador', 'legendaria', 'F', {'aspecto': 'angel', 'aire': 1, 'hab': {'tipo': 'cura', 'radio': 4, 'valor': 120, 'cada': 2}}), ('Leviatán del Cielo', 'titan', 'mitica', 'M', {'aspecto': 'leviatan', 'aire': 1, 'aAire': 1}),
  ('Rayo Celestial', 'rayo', 'rara', 'M', {'color': '#bae6fd'}), ('Ráfaga de Viento', 'empuje', 'comun', 'F', {'color': '#e0f2fe'}), ('Escudo de Nubes', 'escudo', 'epica', 'F', {'color': '#f0f9ff'}),
  ('Torre de Viento', 'torre', 'comun', 'M', {'proy': 'viento'}), ('Cañón de Tormenta', 'canon', 'epica', 'M', {'proy': 'rayo', 'aAire': 1})],
 'sombras': [
  ('Esqueletos Malditos', 'enjambre', 'comun', 'M', {'aspecto': 'esqueleto', 'cant': 5, 'hp': .7}), ('Espectros', 'espectro', 'comun', 'M', {'aspecto': 'espectro', 'cant': 3, 'hp': .55, 'dmg': .6}),
  ('Murciélagos Vampiro', 'enjambre_aire', 'comun', 'M', {'aspecto': 'murcielago', 'hab': {'tipo': 'robo', 'pct': 40}}), ('Caballero Oscuro', 'caballero', 'comun', 'M', {}),
  ('Gárgolas', 'volador', 'rara', 'M', {'aspecto': 'gargola', 'cant': 2, 'hp': .6, 'dmg': .7, 'area': 0, 'proy': None, 'rango': 1}), ('Necromante', 'invocador', 'rara', 'M', {'hab': {'tipo': 'invoca', 'unidad': 'esbirro', 'n': 2, 'cada': 6}}),
  ('Banshee', 'mago', 'rara', 'F', {'aspecto': 'espectro', 'aire': 1, 'hab': {'tipo': 'aturde', 'dur': .6}, 'proy': 'grito'}), ('Verdugo Sombrío', 'guerrero', 'epica', 'M', {'hp': 1.15}),
  ('Asesina de la Noche', 'asesino', 'epica', 'F', {'hab': {'tipo': 'invisible'}}), ('Demonio Ígneo', 'gigante', 'epica', 'M', {'aspecto': 'demonio', 'obj': 'todo', 'area': 1.2, 'hab': {'tipo': 'quema', 'dps': 30, 'dur': 3}}),
  ('Sombra Cambiante', 'asesino', 'legendaria', 'M', {'aspecto': 'espectro', 'hab': {'tipo': 'robo', 'pct': 50}}), ('Señor de las Tinieblas', 'invocador', 'legendaria', 'M', {'hp': 1.5, 'hab': {'tipo': 'invoca', 'unidad': 'esbirro', 'n': 3, 'cada': 6}}),
  ('Abominación', 'golem', 'mitica', 'M', {'aspecto': 'abominacion', 'hab': {'tipo': 'divide', 'unidad': 'esbirro', 'n': 4}}),
  ('Portal Oscuro', 'invoca', 'comun', 'M', {'color': '#7c3aed'}), ('Drenar Vida', 'drenar', 'rara', 'F', {'color': '#be123c'}), ('Maldición de la Noche', 'veneno', 'epica', 'M', {'color': '#6d28d9'}),
  ('Torre Maldita', 'torre', 'rara', 'M', {'proy': 'magia'}), ('Cripta', 'generador', 'epica', 'M', {'hab': {'tipo': 'invoca', 'unidad': 'esbirro', 'n': 2, 'cada': 5}})],
 'hielo': [
  ('Guerrero Glacial', 'guerrero', 'comun', 'M', {'hab': {'tipo': 'congela', 'dur': 1.5}}), ('Lobos de Hielo', 'manada', 'comun', 'M', {'aspecto': 'lobo', 'hab': {'tipo': 'congela', 'dur': 1}}),
  ('Arqueros del Norte', 'arquero', 'comun', 'M', {'hab': {'tipo': 'congela', 'dur': 1}}), ('Pingüinos Bomba', 'enjambre', 'comun', 'M', {'aspecto': 'pinguino', 'cant': 3, 'hab': {'tipo': 'explota', 'radio': 1.6, 'dmg': 150}}),
  ('Druida Boreal', 'sanador', 'rara', 'F', {'hab': {'tipo': 'cura', 'radio': 3, 'valor': 90, 'cada': 2}}), ('Oso Polar Acorazado', 'caballero', 'rara', 'M', {'aspecto': 'oso', 'hp': 1.3}),
  ('Hechicera de Escarcha', 'mago', 'rara', 'F', {'proy': 'hielo', 'hab': {'tipo': 'congela', 'dur': 2}}), ('Yeti', 'gigante', 'epica', 'M', {'aspecto': 'yeti', 'hab': {'tipo': 'congela', 'dur': 1}}),
  ('Jinete del Mamut', 'jinete', 'epica', 'M', {'aspecto': 'mamut', 'hp': 1.6, 'vel': .7}), ('Espíritu del Invierno', 'espectro', 'epica', 'F', {'aspecto': 'espiritu', 'hab': {'tipo': 'congela', 'dur': 2}}),
  ('Golem de Hielo', 'golem', 'epica', 'M', {'aspecto': 'hielo', 'hab': {'tipo': 'divide', 'unidad': 'golemito', 'n': 2}}), ('Emperatriz Glacial', 'mago', 'legendaria', 'F', {'proy': 'hielo', 'hab': {'tipo': 'congela', 'dur': 2.5}, 'hp': 1.4}),
  ('Titán de Escarcha', 'titan', 'mitica', 'M', {'aspecto': 'hielo', 'hab': {'tipo': 'congela', 'dur': 1.5}}),
  ('Ventisca', 'congelar', 'rara', 'F', {'color': '#bae6fd'}), ('Lanza de Hielo', 'linea', 'comun', 'M', {'color': '#67e8f9'}), ('Avalancha', 'bola', 'epica', 'M', {'color': '#e0f2fe'}),
  ('Torre de Hielo', 'torre', 'rara', 'M', {'proy': 'hielo', 'hab': {'tipo': 'congela', 'dur': 1}}), ('Muro de Hielo', 'muro', 'comun', 'M', {})],
 'dragon': [
  ('Guerrero de Fuego', 'guerrero', 'comun', 'M', {'hab': {'tipo': 'quema', 'dps': 25, 'dur': 3}}), ('Dragoncitos', 'enjambre_aire', 'comun', 'M', {'aspecto': 'dragoncito', 'cant': 3, 'hp': 1.6, 'proy': 'fuego', 'rango': 2.5}),
  ('Salamandras', 'manada', 'comun', 'M', {'aspecto': 'salamandra', 'hab': {'tipo': 'quema', 'dps': 20, 'dur': 3}}), ('Caballero Dracónico', 'caballero', 'rara', 'M', {'hp': 1.15}),
  ('Hechicero Volcánico', 'mago', 'rara', 'M', {'proy': 'fuego', 'hab': {'tipo': 'quema', 'dps': 30, 'dur': 3}}), ('Golem de Magma', 'golem', 'epica', 'M', {'aspecto': 'magma', 'hab': {'tipo': 'divide', 'unidad': 'golemito', 'n': 2}}),
  ('Dragón Rojo', 'volador', 'epica', 'M', {'aspecto': 'dragon', 'hp': 1.25}), ('Jinete de Dragón', 'jinete', 'epica', 'M', {'aspecto': 'dragon', 'aire': 1, 'hab': {'tipo': 'carga'}}),
  ('Titán de Lava', 'titan', 'legendaria', 'M', {'aspecto': 'magma', 'hab': {'tipo': 'quema', 'dps': 40, 'dur': 3}}), ('Fénix', 'volador', 'legendaria', 'F', {'aspecto': 'fenix', 'hab': {'tipo': 'revive'}}),
  ('Domadora de Dragones', 'invocador', 'mitica', 'F', {'hab': {'tipo': 'invoca', 'unidad': 'dragoncito', 'n': 1, 'cada': 6}}), ('Dragón Ancestral', 'volador', 'suprema', 'M', {'aspecto': 'dragon', 'hp': 2.6, 'dmg': 1.8, 'c': 8, 'area': 1.6, 'r': 1.1}),
  ('Meteoro', 'meteoro', 'epica', 'M', {'color': '#f97316'}), ('Aliento de Dragón', 'linea', 'rara', 'M', {'color': '#ef4444'}), ('Furia Volcánica', 'furia', 'legendaria', 'F', {'color': '#f97316'}),
  ('Torre de Lava', 'torre', 'rara', 'M', {'proy': 'fuego', 'hab': {'tipo': 'quema', 'dps': 25, 'dur': 3}}), ('Mortero Volcánico', 'mortero', 'epica', 'M', {'proy': 'fuego'}), ('Nido de Dragón', 'generador', 'legendaria', 'M', {'hab': {'tipo': 'invoca', 'unidad': 'dragoncito', 'n': 1, 'cada': 7}})],
}
# Unidades pequeñas que aparecen por habilidades (no son cartas)
MINIS = {'esbirro': dict(n='Esbirro', arq='enjambre', aspecto='esqueleto', hp=110, dmg=55), 'duende': dict(n='Duende', arq='enjambre', aspecto='duende', hp=140, dmg=60),
         'brote': dict(n='Brote', arq='enjambre', aspecto='hongo', hp=180, dmg=45), 'momiita': dict(n='Momia menor', arq='enjambre', aspecto='momia', hp=200, dmg=60),
         'golemito': dict(n='Golemito', arq='caballero', aspecto='piedra', hp=900, dmg=90), 'dragoncito': dict(n='Dragoncito', arq='enjambre_aire', aspecto='dragoncito', hp=180, dmg=50)}

HAB_ARQ = {'asesino': {'tipo': 'asesino'}, 'jinete': {'tipo': 'carga'}, 'titan': {'tipo': 'rugido', 'radio': 3, 'dur': 1}, 'golem': {'tipo': 'divide', 'unidad': 'golemito', 'n': 2}, 'muro': {'tipo': 'provoca', 'radio': 4}}
FR = {
 'caballero': (['¡Por el honor del reino!', '¡Mi escudo no se rompe!', '¡Firmes, soldados!'], ['¡En guardia!', '¡Prueba mi espada!']),
 'guerrero': (['¡A la batalla!', '¡Nadie me detiene!', '¡Siente mi furia!'], ['¡Te voy a aplastar!', '¡Ven si te atreves!']),
 'lanceros': (['¡Lanzas al frente!', '¡Formación!'], ['¡Atravesaremos tus filas!', '¡Ataquen!']),
 'arquero': (['¡Flechas listas!', '¡Ninguno escapa a mi puntería!'], ['¡En el blanco!', '¡Desde aquí te veo!']),
 'mago': (['¡Siente el poder de la magia!', '¡Mis hechizos son eternos!'], ['¡Conjuro lanzado!', '¡Arde en magia!']),
 'sanador': (['¡Aguanten, yo los curo!', '¡Nadie cae mientras yo esté aquí!'], ['¡Luz para mis aliados!', '¡Resistan!']),
 'asesino': (['Nadie me verá llegar...', 'Silencio... y muerte.'], ['Ya es tarde para ti.', 'Te tengo.']),
 'gigante': (['¡Aplastaré esa torre!', '¡Paso, que voy!'], ['¡Torre, prepárate!', '¡Bum!']),
 'golem': (['Piedra... aplasta...', 'Soy... indestructible.'], ['Torre... caerá.', '¡Grrraaah!']),
 'titan': (['¡Tiemblen ante mí!', '¡La tierra se rompe a mi paso!'], ['¡Insectos!', '¡Nada me detiene!']),
 'bestia': (['¡Grrr! ¡A cazar!', '¡Huelo a miedo!'], ['¡Mi presa!', '¡Grrraaaw!']),
 'manada': (['¡Auuu! ¡La manada ataca!', '¡Juntos somos fuertes!'], ['¡Rodéenlo!', '¡Auuu!']),
 'enjambre': (['¡Somos muchos!', '¡Al ataque, hermanos!'], ['¡Ja, ja, ja!', '¡Muérdelo!']),
 'enjambre_aire': (['¡Desde arriba!', '¡Zumbando hacia ti!'], ['¡No nos atrapas!', '¡Ja, ja!']),
 'volador': (['¡Dominamos los cielos!', '¡Desde el aire no hay escape!'], ['¡Fuego desde arriba!', '¡Míralo caer!']),
 'espectro': (['Uuuh... tu alma es mía...', 'Ni la muerte me detiene...'], ['Te atravieso...', 'Frío... eterno...']),
 'jinete': (['¡A toda velocidad!', '¡Directo a la torre!'], ['¡Abran paso!', '¡Embestida!']),
 'invocador': (['¡Levántense, mis siervos!', '¡Mi ejército nunca termina!'], ['¡Atáquenlo!', '¡Más, más!']),
 'torre': (['¡Defensa lista!', '¡Nadie pasa por aquí!'], ['¡Disparo!', '¡Objetivo a la vista!']),
 'canon': (['¡Cañón cargado!'], ['¡Fuego!']), 'mortero': (['¡Artillería lista!'], ['¡Allá va!']), 'generador': (['¡Que salgan los refuerzos!'], ['¡Más tropas!']), 'muro': (['¡Este muro no cae!'], ['¡Golpea si puedes!']),
}
RESP = ['¡Eso es todo lo que tienes?', '¡Ja! Ni me hiciste cosquillas.', '¡Te arrepentirás!', '¡No me rindo!', '¡Vamos a ver quién gana!', '¡Ahora verás!']
MUERE = ['¡Nooo... el reino...!', '¡Volveré más fuerte!', '¡Me las pagarás!', '¡Vénguenme, hermanos!', '¡Imposible!', '¡Caigo... pero no me rindo!']
VOCES = {'M': ['es-MX-JorgeNeural', 'es-CO-GonzaloNeural', 'es-PE-AlexNeural', 'es-AR-TomasNeural', 'es-CL-LorenzoNeural', 'es-VE-SebastianNeural', 'es-EC-LuisNeural', 'es-BO-MarceloNeural', 'es-UY-MateoNeural', 'es-US-AlonsoNeural', 'es-GT-AndresNeural', 'es-CR-JuanNeural', 'es-DO-EmilioNeural', 'es-PR-VictorNeural', 'es-ES-AlvaroNeural'],
         'F': ['es-MX-DaliaNeural', 'es-CO-SalomeNeural', 'es-PE-CamilaNeural', 'es-AR-ElenaNeural', 'es-CL-CatalinaNeural', 'es-VE-PaolaNeural', 'es-EC-AndreaNeural', 'es-BO-SofiaNeural', 'es-UY-ValentinaNeural', 'es-US-PalomaNeural', 'es-GT-MartaNeural', 'es-CR-MariaNeural', 'es-DO-RamonaNeural', 'es-PR-KarinaNeural', 'es-ES-ElviraNeural']}
TONO = {'gigante': (-18, -10, .5), 'golem': (-25, -15, .3), 'titan': (-28, -12, .2), 'enjambre': (25, 15, 1.7), 'enjambre_aire': (30, 18, 1.9), 'espectro': (-10, -12, .6), 'bestia': (-8, 5, .7), 'manada': (-5, 8, .8),
        'asesino': (-5, -5, .8), 'mago': (0, -3, 1), 'sanador': (5, -5, 1.1), 'volador': (-6, 0, .8), 'torre': (0, 0, .9), 'canon': (-10, 0, .7), 'mortero': (-12, 0, .7), 'generador': (0, 0, .9), 'muro': (-20, -10, .5)}

def slug(t): t = t.lower(); t = re.sub('[áàä]', 'a', t); t = re.sub('[éè]', 'e', t); t = re.sub('[íì]', 'i', t); t = re.sub('[óò]', 'o', t); t = re.sub('[úùü]', 'u', t); t = t.replace('ñ', 'n'); return re.sub('[^a-z0-9]+', '_', t).strip('_')

def historia(nombre, mundo, arq, tipo):
    M = mundo['n']
    if tipo == 'hechizo': return f'Antiguo conjuro del {M}. Los sabios dicen que quien lo domina puede cambiar el destino de una batalla en un instante.'
    if tipo == 'estructura': return f'Construida por los maestros del {M} para proteger sus fronteras. Ha resistido mil asedios sin caer.'
    return {'caballero': f'Juró proteger el {M} con su vida. Su escudo lleva las marcas de cien batallas.', 'guerrero': f'Nació en las tierras del {M} y aprendió a pelear antes que a caminar.',
            'arquero': f'Entrenó su puntería en los confines del {M}. Dicen que nunca ha fallado un disparo.', 'mago': f'Estudió los secretos más antiguos del {M}. Su magia ilumina el campo de batalla.',
            'sanador': f'Guardián de la vida en el {M}. Donde pasa, las heridas se cierran.', 'asesino': f'Una leyenda susurrada en el {M}. Nadie ha visto su rostro y vivido para contarlo.',
            'gigante': f'Despertó de un sueño de siglos en el {M}. Solo quiere derribar torres.', 'golem': f'Forjado con la esencia misma del {M}. Al caer, se divide para seguir luchando.',
            'titan': f'El ser más poderoso del {M}. La tierra tiembla con cada paso que da.', 'jinete': f'Cabalga por el {M} más rápido que el viento. Su objetivo: las torres enemigas.',
            'invocador': f'Maestro de las fuerzas ocultas del {M}. Nunca pelea solo.', 'volador': f'Surca los cielos del {M} vigilando a los enemigos desde lo alto.',
            'espectro': f'Un alma errante del {M} que encontró un nuevo propósito en la batalla.'}.get(arq, f'Criatura legendaria del {M}, temida y respetada por igual.')

cartas = []
rnd = random.Random(2026)
for wi, mundo in enumerate(MUNDOS):
    lista = L[mundo['id']]; assert len(lista) == 18, (mundo['id'], len(lista))
    orden = {'comun': 0, 'rara': 1, 'epica': 2, 'legendaria': 3, 'mitica': 4, 'suprema': 5}
    lista = sorted(lista, key=lambda x: orden[x[2]])
    for i, (nombre, arq, rar, gen, ex) in enumerate(lista):
        R = RAREZAS[rar]; arena = wi * 3 + (0 if i < 6 else 1 if i < 12 else 2)
        if wi == 0: arena = 0 if i < 8 else 1 if i < 13 else 2
        cid = slug(nombre); vlist = VOCES[gen]; vrnd = random.Random(cid)
        c = dict(id=cid, n=nombre, mundo=mundo['id'], m=wi, arena=arena, rareza=rar, g=gen)
        if arq in HECHIZOS:
            h = dict(HECHIZOS[arq]); c.update(tipo='hechizo', arq=arq, c=min(10, h.pop('c') + R[2]), **{k: v for k, v in h.items()})
            if 'dmg' in c: c['dmg'] = round(c['dmg'] * R[1])
            if 'valor' in c: c['valor'] = round(c['valor'] * R[1])
            c['color'] = ex.get('color', mundo['pal'][0]); c['d'] = ex.get('texto') or {'bola': 'Daña todo en un área. A las torres les hace menos daño.', 'meteoro': 'Tras un instante cae del cielo y arrasa un área enorme.', 'congelar': 'Congela a los enemigos en el área durante unos segundos.', 'rayo': 'Golpea a los 3 enemigos con más vida en el área.', 'linea': 'Una descarga en línea recta que atraviesa a todos los enemigos.', 'cura': 'Cura a tus tropas dentro del área durante unos segundos.', 'veneno': 'Envenena el área: daño continuo y los enemigos se vuelven lentos.', 'furia': 'Tus tropas en el área atacan y se mueven más rápido.', 'tornado': 'Arrastra a los enemigos hacia el centro.', 'empuje': 'Una ráfaga que empuja y daña a los enemigos.', 'escudo': 'Da un escudo de energía a tus tropas en el área.', 'invoca': 'Abre un portal del que salen guerreros esbirros.', 'drenar': 'Roba la vida de los enemigos y cura a tus tropas.'}[arq]
            fr = (['¡Siente el poder de este hechizo!', f'¡Magia del {mundo["n"]}!'], ['¡Conjuro lanzado!'])
        else:
            b = dict(ARQ[arq]); tipo = 'estructura' if b['vel'] == 0 else 'tropa'
            for k in ('cant', 'aire', 'aAire', 'obj', 'area', 'proy', 'rango', 'vel', 'r'):
                if k in ex: b[k] = ex[k]
            var = 1 + (rnd.random() - .5) * .14
            hp = b['hp'] * R[1] * ex.get('hp', 1) * var; dmg = b['dmg'] * R[1] * ex.get('dmg', 1) / var
            coste = ex.get('c', b['c'] + R[2]) + (1 if ex.get('hp', 1) > 1.5 and 'c' not in ex else 0)
            c.update(tipo=tipo, arq=arq, aspecto=ex.get('aspecto', mundo['id']), c=max(1, min(10, coste)), hp=round(hp, -1), dmg=round(dmg), golpe=b['golpe'], rango=b.get('rango', 1), vel=b['vel'], cant=b.get('cant', 1), r=b['r'], obj=b.get('obj', 'todo'))
            for k in ('aire', 'aAire', 'area', 'proy', 'dur'):
                if b.get(k): c[k] = b[k]
            hab = ex.get('hab') or HAB_ARQ.get(arq)
            if hab: c['hab'] = hab
            c['d'] = {'tropa': {'caballero': 'Resistente y valiente: ideal para defender.', 'guerrero': 'Golpes poderosos que dañan a varios enemigos a la vez.', 'lanceros': 'Tres lanceros con buen alcance.', 'arquero': 'Ataca a distancia, también a enemigos que vuelan.', 'mago': 'Lanza magia a distancia que daña en área.', 'sanador': 'Cura a las tropas aliadas cercanas.', 'asesino': 'Busca a las unidades más débiles y las elimina rápido.', 'gigante': 'Un tanque enorme que solo ataca torres y estructuras.', 'golem': 'Muy resistente; al caer se divide en unidades más pequeñas.', 'titan': 'Poder devastador: daña en un área enorme.', 'bestia': 'Rápida y feroz.', 'manada': 'Una manada veloz que rodea a sus presas.', 'enjambre': 'Muchas unidades pequeñas y rápidas.', 'enjambre_aire': 'Un enjambre volador muy rápido.', 'volador': 'Vuela sobre el río y ataca desde el aire.', 'espectro': 'Flota sobre el campo de batalla y ataca cuerpo a cuerpo.', 'jinete': 'Corre directo hacia las torres enemigas.', 'invocador': 'Invoca aliados cada pocos segundos.'}.get(arq, ''),
                         'estructura': {'torre': 'Torre defensiva que dispara a todo lo que se acerca.', 'canon': 'Defensa terrestre de mucho daño.', 'mortero': 'Artillería de largo alcance que daña en área.', 'generador': 'Produce tropas cada pocos segundos.', 'muro': 'Atrae a los enemigos cercanos y los retiene.'}.get(arq, '')}[tipo]
            fr = FR.get(arq, FR['guerrero'])
        tn = TONO.get(c.get('arq'), (0, 0, 1))
        c['historia'] = historia(nombre, mundo, c.get('arq'), c['tipo'])
        c['voz'] = dict(edge=vlist[vrnd.randrange(len(vlist))], pitch=tn[0] + vrnd.randint(-4, 4), rate=tn[1] + vrnd.randint(-5, 5), tono=round(max(.1, min(2, tn[2] + (vrnd.random() - .5) * .3)), 2), vel=round(1 + tn[1] / 100 + (vrnd.random() - .5) * .1, 2))
        c['frases'] = dict(aparece=fr[0][:2] + [mundo['vozMundo']], ataque=fr[1], resp=vrnd.sample(RESP, 2), muere=vrnd.sample(MUERE, 1))
        c['anim'] = dict(aparicion='cae del cielo con onda de polvo', movimiento='balanceo al caminar', ataque='embestida hacia el objetivo', dano='destello blanco', muerte='estallido de partículas y humo')
        c['sfx'] = dict(aparece='plantar', ataque={'arquero': 'swish', 'mago': 'hielo', 'volador': 'swish'}.get(c.get('arq'), 'splat'), impacto='choque', muere='pop')
        cartas.append(c)

reina = dict(id='glory_brown', n='Glory Brown', titulo='La Reina de la Victoria', mundo='alba', m=-1, arena=0, rareza='real', g='F', tipo='tropa', arq='reina', aspecto='reina',
    c=6, hp=3500, dmg=450, golpe=1.6, rango=4.5, vel=1.0, cant=1, r=.75, obj='todo', aAire=1, proy='dorado',
    hab=dict(tipo='reina', luz=dict(radio=4, valor=260, cada=7), rayo=dict(dmg=520, ancho=1.3, largo=8, cada=9), escudo=dict(radio=4, red=40, dur=5, cada=11), corazon=dict(radio=5, pct=50, dur=10, cada=18)),
    d='Líder legendaria de apoyo y combate. Cura, protege y potencia a su equipo.',
    historia='Una líder legendaria que honra el legado de su abuelita. Con un corazón valiente, su luz inspira a sus aliados y derrota a sus enemigos. Su legado vive en cada reino y su luz nunca se apagará.',
    homenaje='Su legado vive en cada reino y su luz nunca se apagará.',
    habilidades=[['✚', 'Luz de Amor', 'Cura a los aliados cercanos y elimina efectos negativos.'], ['⚡', 'Rayo Dorado', 'Descarga de energía dorada en línea recta.'], ['🛡️', 'Escudo Real', 'Barrera que reduce el daño de los aliados cercanos.'], ['👑', 'Corazón de Abuelita', 'Definitiva: más daño y velocidad para los aliados por 10 segundos.']],
    voz=dict(edge='es-PE-CamilaNeural', pitch=-2, rate=-6, tono=.95, vel=.95),
    frases=dict(aparece=['¡Por mi familia y por mi reino!', 'La luz de mi abuelita me guía.', '¡Unidos somos invencibles!'], ataque=['¡Rayo dorado!', '¡Por la victoria!'], resp=['Mi corazón no conoce el miedo.', 'Nunca me rendiré.'], muere=['Mi luz... nunca se apagará.'],
               luz='¡Luz de amor, sanen sus heridas!', rayo='¡Rayo dorado!', escudo='¡Escudo real, protéjanse!', corazon='¡Corazón de abuelita! ¡Con todo, mi gente!'),
    anim=dict(aparicion='descenso real con columna de luz dorada', movimiento='caminar majestuoso con la capa ondeando', ataque='rayo dorado desde el cetro', dano='destello dorado', muerte='se disuelve en luz dorada'),
    sfx=dict(aparece='nivel', ataque='hielo', impacto='choque', muere='ganar'))
cartas.append(reina)
assert len(cartas) == 127, len(cartas)
tipos = {t: sum(1 for c in cartas if c['tipo'] == t) for t in ('tropa', 'hechizo', 'estructura')}
assert tipos == {'tropa': 91, 'hechizo': 21, 'estructura': 15}, tipos  # 90 tropas + la Reina
datos = dict(version=1, rarezas={k: dict(n=v[0], color=v[3]) for k, v in RAREZAS.items()}, mundos=MUNDOS, arenas=[dict(n=a[0], trofeos=a[1], mundo=i // 3) for i, a in enumerate(ARENAS)], minis=MINIS,
             balance=dict(manaInicial=5, manaMax=10, regen=2.8, dobleDesde=60, duracion=180, extra=60, torre=dict(vida=1500, dmg=55, golpe=.8, rango=7.5), rey=dict(vida=2700, dmg=75, golpe=1, rango=7)), cartas=cartas)
open(os.path.join(BASE, 'cartas.js'), 'w').write('// Catálogo oficial de GLORY BROWN: El Choque de los Reinos. Generado por herramientas/glory_cartas.py — no editar a mano.\nwindow.GLORY = ' + json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + ';\n')
frases = []
for c in cartas:
    for k, v in c['frases'].items():
        for i, t in enumerate(v if isinstance(v, list) else [v]): frases.append(dict(id=f"{c['id']}__{k}{i}", texto=t, voz=c['voz']))
json.dump(dict(frases=frases), open(os.path.join(BASE, 'frases.json'), 'w'), ensure_ascii=False)
print(len(cartas), 'cartas', tipos, len(frases), 'frases')
