// Los 10 canales sugeridos. Los horarios son un punto de partida (hora de tu PC);
// ajústalos a las 2-3 semanas según cuándo te ve tu público en las estadísticas.
// Los 3 con active:true son los recomendados para las primeras semanas.
module.exports = [
  { name: 'Dato Bomba', niche: 'Curiosidades del mundo', color: '#7c2d12', voice: 'es-MX-JorgeNeural', rate: 8, pitch: 0, tone: 'enérgico y sorprendido', times: { youtube: '12:00', tiktok: '19:00', facebook: '13:00' } },
  { name: 'Historia Exprés', niche: 'Historia en 60 segundos, con foco en Latinoamérica', color: '#78350f', voice: 'es-CO-GonzaloNeural', rate: 0, pitch: -2, tone: 'narrador intrigante', times: { youtube: '18:00', tiktok: '20:00', facebook: '13:30' } },
  { active: true, name: 'Leyendas de Mi Tierra', niche: 'Leyendas y misterios latinoamericanos', color: '#1e1b4b', voice: 'es-MX-JorgeNeural', rate: -6, pitch: -6, tone: 'misterioso, de suspenso', times: { youtube: '21:00', tiktok: '21:30', facebook: '20:30' } },
  { active: true, name: 'Plata Clara', niche: 'Finanzas personales y ahorro', color: '#14532d', voice: 'es-PE-AlexNeural', rate: 4, pitch: 0, tone: 'claro, práctico y confiable', times: { youtube: '12:30', tiktok: '19:30', facebook: '12:00' } },
  { name: 'Lo Que Tu Mente Calla', niche: 'Psicología y comportamiento humano', color: '#4c1d95', voice: 'es-CO-SalomeNeural', rate: 0, pitch: 0, tone: 'reflexivo y cercano', times: { youtube: '20:00', tiktok: '21:00', facebook: '20:00' } },
  { name: 'Truco Tech', niche: 'Tecnología, celulares y trucos de IA', color: '#0c4a6e', voice: 'es-AR-TomasNeural', rate: 8, pitch: 0, tone: 'rápido y útil', times: { youtube: '17:00', tiktok: '19:00', facebook: '18:00' } },
  { active: true, name: 'La Huerta Habla', niche: 'Salud y remedios caseros con frutas y verduras', color: '#166534', voice: 'es-MX-DaliaNeural', rate: 4, pitch: 4, tone: 'simpático, divertido y responsable', style: 'personaje', times: { youtube: '08:00', tiktok: '12:00', facebook: '09:00' },
    // Les faltan las imágenes: se suben desde Canales (boca cerrada y boca abierta).
    characters: [
      { id: 'limon', name: 'Limón', voice: 'es-MX-DaliaNeural', rate: 6, pitch: 8 },
      { id: 'ajo', name: 'Ajo', voice: 'es-MX-JorgeNeural', rate: 0, pitch: -6 },
      { id: 'jengibre', name: 'Jengibre', voice: 'es-CO-GonzaloNeural', rate: 4, pitch: 0 },
      { id: 'pina', name: 'Piña', voice: 'es-CO-SalomeNeural', rate: 6, pitch: 4 },
      { id: 'zanahoria', name: 'Zanahoria', voice: 'es-PE-CamilaNeural', rate: 4, pitch: 2 },
    ] },
  { name: 'Bestias Asombrosas', niche: 'Animales asombrosos', color: '#713f12', voice: 'es-PE-CamilaNeural', rate: 5, pitch: 0, tone: 'asombrado y alegre', times: { youtube: '16:00', tiktok: '18:00', facebook: '17:00' } },
  { name: 'Cosmos en Corto', niche: 'Espacio y universo', color: '#0f172a', voice: 'es-CL-LorenzoNeural', rate: -2, pitch: -3, tone: 'épico y fascinante', times: { youtube: '22:00', tiktok: '22:00', facebook: '21:00' } },
  { name: 'Modo Disciplina', niche: 'Hábitos, productividad y motivación', color: '#7f1d1d', voice: 'es-MX-JorgeNeural', rate: 6, pitch: -2, tone: 'motivador y directo', times: { youtube: '06:30', tiktok: '07:00', facebook: '07:30' } },
];
