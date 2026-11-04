// Rivales de la computadora para cuando no hay jugadores disponibles en línea.
// Tienen nombre y avatar normales para que la partida se sienta natural; las reglas y los Términos
// avisan que, si no hay jugadores disponibles, se juega contra la computadora, y al final de la partida se indica con 🤖.
const NOMBRES = ['Valeria', 'Mateo', 'Camila', 'Santiago', 'Luciana', 'Diego', 'Sofía', 'Thiago', 'Daniela', 'Sebastián', 'Mariana', 'Gael', 'Renata', 'Joaquín', 'Ximena', 'Alonso', 'Fernanda', 'Leonardo', 'Antonella', 'Emiliano', 'Isabella', 'Rodrigo', 'Brianna', 'Nicolás', 'Abril', 'Adrián', 'Kiara', 'Bruno', 'Alessandra', 'Fabián', 'Milagros', 'Josué', 'Dayana', 'Franco', 'Nayeli', 'Kevin', 'Yamila', 'Piero', 'Luana', 'Jhon'];
const APODOS = ['Gamer', 'Pro', 'Crack', 'King', 'Queen', 'Ninja', 'Star', 'Zero', 'Max', 'XD', 'Lima', 'Andino', 'Shadow', 'Fire', 'Neo', 'Rayo', 'Loba', 'Tigre', 'Flash', 'Toxic'];
const az = l => l[Math.floor(Math.random() * l.length)];
function nombreRival() {
  const n = az(NOMBRES), f = Math.random();
  if (f < .3) return n;
  if (f < .55) return n + az(['_', '', '.']) + (Math.floor(Math.random() * 90) + 10);
  if (f < .8) return n + az(APODOS);
  return (az(APODOS) + az(['_', '']) + n).slice(0, 18);
}
const avatarRival = () => 'a' + String(1 + Math.floor(Math.random() * 48)).padStart(2, '0');
// Segundos de espera antes de completar con rivales de la computadora (configurable)
const ESPERA = { duelo1v1: +process.env.BOT_ESPERA_1V1 || 10, duelo2v2: +process.env.BOT_ESPERA_2V2 || 18, mesa: +process.env.BOT_ESPERA_MESA || 12 };
module.exports = { nombreRival, avatarRival, ESPERA };
