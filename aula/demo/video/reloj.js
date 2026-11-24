// solo para grabar el video: corre el reloj a las 7:52 a. m. de Lima de hoy
const RD = Date, lima = new RD(RD.now() - 5 * 3600e3).toISOString().slice(0, 10), off = new RD(lima + 'T' + (process.env.RELOJ || '12:52:00') + 'Z').getTime() - RD.now();
class D extends RD { constructor(...a) { if (!a.length) super(RD.now() + off); else super(...a); } static now() { return RD.now() + off; } }
global.Date = D; process.env.RELOJ_OFF = String(off);
