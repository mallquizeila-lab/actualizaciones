# 🎓 ProfeTok · sistema para docentes y familias

**ProfeTok** es la plataforma (de la familia de Yupitok). Su personaje y asistente es **Libretín**,
una libreta de notas simpática: tapa celeste con espiral, lentes redondos, mejillas rosadas,
un lápiz amarillo en la "oreja" y una estrella dorada «AD» en la mano. Es alegre, ordenado y cariñoso.
Frase: **«¡Libretín te cuenta cómo va tu hijo!»** · Para docentes: **«Tu aula ordenada en un minuto.»**

Prompt para imágenes y videos (Flow / Cloudflare):
> Original cute 3D cartoon mascot LIBRETIN: a friendly light-blue school report notebook with a spiral binding on the left,
> big round glasses, big expressive eyes, rosy cheeks, a yellow pencil tucked like an ear, small arms and legs with yellow shoes,
> holding a golden star with the letters "AD". Bright classroom background, soft light, vibrant colors, family-friendly.

## Qué hace
- Docente / director: aulas, alumnos con foto, asistencia (P/T/F/J), notas por curso y bimestre (AD/A/B/C o 0–20),
  tareas con entregas, bitácora (incidencias y logros), comunicados, alerta temprana, libreta imprimible con logo, enlace de Meet.
- Familias: entran con su correo por un enlace de invitación (WhatsApp) y ven SOLO a su hijo (el servidor lo revisa en cada consulta).
- Membresías: prueba gratis 15 días · Docente S/ 19 · Colegio S/ 149 (precios editables). Pago por Yape/Plin: el docente
  envía su n.° de operación y tú lo apruebas en tu panel de dueño. Si vence, queda en solo lectura (no se borra nada).
- Privacidad (Ley 29733): la familia autoriza el uso de datos al crear su cuenta; fotos privadas; borrar alumno borra todo.
- Respaldo diario de la base de datos (14 días).

## Encenderlo
ShortForge → 📣 Página viral → tarjeta **🎓 ProfeTok** → escribe tu correo y tu Yape → **Encender**.
Para internet: Cloudflare → Zero Trust → Networks → Tunnels → tu túnel → Public Hostname → tu dominio → `http://localhost:3400`.

## 📧 Correos a las familias (y email marketing)
- Pestaña **📧 Correos** en cada aula: plantillas (Tarea, Reunión con fecha/hora y enlace de Meet o Zoom, Comunicado,
  Recordatorio, Felicitación). `{nombre}` y `{alumno}` se cambian solos. Un clic envía a todas las familias o a las elegidas.
- Al crear una **tarea** o un **comunicado**, la casilla «📧 Enviar también por correo» ya viene marcada.
- Tu panel de dueño: configuración del envío, correo de prueba y **campañas a docentes** (todos, en prueba, vencidos o activos).
- Cada correo trae «Dejar de recibir correos» (cumple la ley y protege tu reputación de envío).
- Límite mensual por cuenta: prueba 100 · Docente 1 500 · Colegio 15 000 correos.

**Proveedor de envío**
- Para empezar: **Brevo** (gratis 300 correos al día). brevo.com → verifica tu remitente (ideal: hola@tudominio) → crea una API key → pégala en tu panel de dueño.
- Para miles de docentes: **Amazon SES** (≈ US$ 0.10 por cada 1 000 correos). En tu panel elige «SMTP» con
  servidor `email-smtp.us-east-1.amazonaws.com`, puerto 465 y el usuario/clave SMTP que te da SES.
- Para que los correos no caigan en spam: usa un remitente de **tu dominio** y agrega en Cloudflare los registros SPF/DKIM que te indique Brevo o SES.

## 🤖 Mi asistente (IA para cada docente)
Menú **🤖 Mi asistente**. Libretín conoce el CNEB, las aulas, grados y cursos del docente y quiénes necesitan apoyo
(solo con su primer nombre: nunca se envían apellidos, DNI, fotos, salud ni datos de las familias a la IA).
Botones rápidos: sesión de aprendizaje, examen con respuestas, rúbrica AD/A/B/C, ficha de trabajo, problemas de matemática
contextualizados en Perú, unidad didáctica, conclusiones descriptivas, plan de apoyo, mensaje para padres, dinámicas,
adaptación para NEE y oficios/informes. Cada respuesta se puede **copiar, imprimir con el nombre del colegio o enviar a las familias** por correo.
Usa la IA de ShortForge (sin costo extra; se conecta solo con una clave privada dentro de tu VPS).
Consultas al mes: prueba 40 · Docente 400 · Colegio 4 000.

## 🚀 Crecimiento: captar, convertir y cobrar en automático
Todo vive dentro de ProfeTok (sin Mautic ni servidores extra). Panel: entra como dueño → **🚀 Crecimiento**.

**Captar**
- **Recursos gratis** (registro auxiliar CNEB, plantilla de sesión y 30 mensajes para familias, todos originales). El docente deja nombre, correo y, si quiere, WhatsApp, y descarga al instante; el enlace del correo confirma su dirección. Puedes subir más (texto o PDF propio).
- Enlace para anuncios y grupos: `https://profetok.yupitok.com/recursos?utm_source=facebook` (cambia la fuente: `tiktok`, `grupo-wa`…). La ventana del recurso también aparece sola al leer media página, a los 40 s o al intentar salir (una sola vez).
- **Afiliados:** cada docente tiene su enlace en «Plan». El invitado recibe 7 días extra. Un colega cuenta (🟢) recién cuando paga su plan; si solo se registró queda en rojo (🔴). Con 5 colegas que pagaron se gana 1 mes gratis y el contador vuelve a cero (para otro mes, 5 nuevos). Las recargas de saldo no cuentan como suscripción.

**Convertir (automático cada 5 minutos)**
- Contactos: día 2 beneficios · día 5 testimonio · día 9 último empujón.
- Prueba gratis: día 1 primeros pasos · faltan 3 días · último día.
- Reactivación si no paga: testimonios → **cupón personal real de 30 % por 72 h** → último aviso. Si paga, sale solo.
- Clientes: aviso de renovación 5 días antes. Pago con tarjeta que no se completó: «¿tuviste problemas?».
- Canales: correo, avisos 🔔 en el celular o PC (Web Push propio, gratis) y WhatsApp. Sin la API de Meta, WhatsApp queda en una **lista para enviar con un toque** desde tu celular; con la API oficial (y plantillas aprobadas) sale solo, de a poco.
- Puedes editar cada texto o apagar cualquier paso. La publicidad va solo a quien marcó la casilla, y todo mensaje lleva «darse de baja».

**Cobrar**
- **📱 QR dinámico Yape + Plin (Izipay):** el docente pone su DNI y celular, se abre la ventana segura de Izipay con un **QR interoperable con el monto exacto**, lo escanea con Yape, Plin o la app de su banco (también acepta código Yape, Plin y tarjeta) e **Izipay avisa a ProfeTok (IPN) y el plan se activa solo, al instante**. Cada aviso se verifica con su firma (HMAC-SHA256 con tu Clave Hash); si algo no cuadra, ProfeTok le pregunta directo a Izipay por esa orden antes de activar. Si el aviso se demora, el navegador del docente pide la confirmación a Izipay.
  - Configúralo en 🚀 Crecimiento → 💳 Pagos con tus claves de **panel.izipay.pe → Desarrolladores → Claves**: Código de comercio, Clave API del nuevo botón de pagos, Clave Hash y Clave pública (RSA). Empieza en modo **Pruebas** (sandbox) y luego pasa a **Producción**.
- **Mercado Pago:** tarjeta (y Yape si tu cuenta lo tiene). El plan se activa solo con el webhook. Se verifica la firma y se consulta el pago directo a Mercado Pago (estado, monto, referencia).
- **Yape y Plin:** número, titular y QR propios de cada uno. El docente paga, escribe el n.° de operación (y si quiere sube la captura) y **recibe 48 h de acceso al momento**. A ti te llega un aviso por correo y 🔔; lo apruebas en «📊 Panel». Si lo rechazas, se quita el acceso provisional. No se acepta el mismo n.° de operación dos veces.
- Descuentos por pagar varios meses (3 m −10 %, 6 m −15 %, 12 m −25 %) y **cupones** (Día del Maestro, etc.).

**Medir:** embudo visitas → contactos → pruebas → pagos, por fuente, con ingresos. Contactos con puntaje de interés, historial y exportación a Excel.

**Privacidad (Ley 29733):** página `/privacidad` con tus datos, permisos separados, baja con un clic y borrado de contacto. Los datos de alumnos y familias nunca se usan para publicidad. Te toca inscribir tus bancos de datos ante la Autoridad Nacional de Protección de Datos Personales.

## 👛 Saldo, renovación fácil y recordatorios
- **Saldo:** el docente recarga cuando quiere (Yape/Plin, tarjeta o QR). Regalo: +5 % desde S/ 100 y +8 % desde S/ 200. Paga su plan con «👛 Pagar con mi saldo» y, si lo deja activado, ProfeTok renueva 1 mes con el saldo un día antes de vencer (si no alcanza, le avisa).
- **🎁 Premio por renovar antes:** +7 días si paga con 7 días o más de anticipación (no aplica a la renovación automática con tarjeta).
- **🔄 Renovar en 1 clic:** repite el último plan, meses y forma de pago (o usa el saldo si alcanza).
- **💳 Renovación automática con tarjeta** (Mercado Pago, suscripción mensual), cancelable cuando quiera.
- **Recordatorios:** 10, 5 y 2 días antes (correo, aviso 🔔 y WhatsApp) y una franja en su panel. A quien tiene renovación automática no se le recuerda.

## 🔑 Olvidé mi contraseña y ☁️ copia de seguridad
- **Olvidé mi contraseña:** enlace al correo (vale 1 hora, un solo uso, cierra las sesiones abiertas). Sin correo configurado: botón de WhatsApp a soporte. El dueño (🔑 en Cuentas) y el docente (🔑 en Familias conectadas) pueden generar un enlace de 24 h para mandarlo por WhatsApp.
- **Respaldo en la nube:** cada día la base de datos se comprime, se cifra (AES-256-GCM con tu clave de respaldo) y se sube a Cloudflare R2 / Backblaze B2 / Amazon S3; se guardan 30 días. Botón para descargarlo a tu PC. Restaurar: `node restaurar.js archivo.db.gz.enc "tu clave" aula.db`. Nota: las fotos (logos, fotos de exámenes, comprobantes) no van en este respaldo diario.

## 📋 Mi equipo (director) — director.js
- `GET /api/equipo` (solo director): por docente → semáforo 🟢🟡🔴 con motivos (días de clase sin asistencia, días sin notas, mensajes/justificaciones sin responder, % familias conectadas, asistencia de hoy después de las 11 a. m.), último ingreso; por aula → asistencia 30 días, promedio, alumnos en riesgo, % familias.
- `POST /api/equipo-recordar {docente_id, tipo: asistencia|notas|mensajes}`: aviso amable al celular del docente (1 por día, queda en auditoría). Si el docente no activó notificaciones, la app abre un correo con el mismo texto.
- App: pestaña «📋 Mi equipo» y tarjeta «Mi equipo hoy» en el inicio del director.

## 👩‍🏫 Cupo de docentes del plan Colegio
- Plan Colegio (S/ 149) incluye hasta 14 docentes activos (`PLANES.colegio.docentes`); desde el 15, S/ 10 al mes cada uno (`PLANES.colegio.extra`). El dueño puede cambiar ambos en su panel (💲 Precios).
- `pagos.precio(plan, meses, cupón, colegio_id)` suma los adicionales en Yape/Plin, Mercado Pago, Izipay, pago con saldo y renovación automática.
- En la prueba gratis el tope es 14. Con el plan Docente el director no puede sumar docentes.
- `POST /api/docente`: desde el 15 responde `{confirmar}` y solo agrega con `confirmo: true`. `{quitar: id}` desactiva al docente (sus aulas y datos se quedan; se pueden reasignar editando el aula). Volver a agregar su correo lo reactiva con una clave nueva.
- La suscripción automática de Mercado Pago guarda el monto del día en que se creó: si cambia el número de docentes, se debe volver a activar.
