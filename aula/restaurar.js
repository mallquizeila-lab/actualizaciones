// 🛟 Restaurar un respaldo de ProfeTok descargado de la nube (o del panel).
// Uso:  node restaurar.js ProfeTok-respaldo-2026-11-21.db.gz.enc "tu clave de respaldo" aula.db
// Luego apaga ProfeTok, reemplaza el aula.db de la carpeta de datos por el restaurado y vuelve a encenderlo.
const fs = require('fs'), zlib = require('zlib'), { descifrar } = require('./nube');
const [, , archivo, clave, salida = 'aula-restaurada.db'] = process.argv;
if (!archivo || !clave) { console.log('Uso: node restaurar.js archivo.db.gz.enc "clave de respaldo" [salida.db]'); process.exit(1); }
try { fs.writeFileSync(salida, zlib.gunzipSync(descifrar(fs.readFileSync(archivo), clave))); console.log('✅ Restaurado en ' + salida); }
catch (e) { console.log('❌ No se pudo restaurar: ' + (/auth|decrypt/i.test(e.message) ? 'la clave no es correcta' : e.message)); process.exit(1); }
