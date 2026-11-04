# Agrega a public/tests.json los juegos EDUCATIVOS (por nivel) y CRISTIANOS.
# Ejecutar: python3 herramientas/edu_fe.py   (se puede repetir: reemplaza lo anterior)
# Formato de cada pregunta: [pregunta, [4 opciones], índice de la correcta, explicación]
import json, os
RUTA = os.path.join(os.path.dirname(__file__), '..', 'public', 'tests.json')
NIVELES = [['p1', '🎒 1.° a 3.° primaria'], ['p2', '📐 4.° a 6.° primaria'], ['sec', '🧪 Secundaria'], ['sup', '🎓 Instituto y universidad']]

def trivia(id, cat, e, t, d, preguntas, nivel=None, minutos=3):
    x = {'id': id, 'cat': cat, 'e': e, 't': t, 'd': d, 'min': minutos, 'tipo': 'trivia', 'preguntas': preguntas}
    if nivel: x['nivel'] = nivel
    assert len(preguntas) == 10 and all(len(p) == 4 and len(p[1]) == 4 and 0 <= p[2] < 4 for p in preguntas), id
    return x

def juego(id, cat, e, t, d, motor, nivel=None, minutos=2, palabras=None):
    x = {'id': id, 'juego': motor, 'cat': cat, 'e': e, 't': t, 'd': d, 'min': minutos, 'tipo': 'arcade'}
    if nivel: x['nivel'] = nivel
    if palabras: x['palabras'] = palabras
    return x

E = 'educativos'; F = 'cristianos'
NUEVOS = [
  # ===================== 🎒 1.° a 3.° de primaria =====================
  juego('edu-sumas', E, '➕', 'Sumas y restas', 'Resuelve sumas y restas contra el reloj. ¡Cada vez más difíciles!', 'sumas', 'p1'),
  juego('edu-ingles', E, '🇬🇧', 'Inglés con emojis', 'Mira el dibujo y elige cómo se dice en inglés.', 'ingles', 'p1'),
  juego('edu-ahorcado-p1', E, '🔤', 'Adivina la palabra', 'Ahorcado de animales, frutas y colores.', 'ahorcado', 'p1',
        palabras={'Animales': ['PERRO', 'GATO', 'VACA', 'LEON', 'MONO', 'PATO', 'OVEJA', 'CONEJO', 'TIGRE', 'LLAMA'], 'Frutas': ['MANZANA', 'PLATANO', 'UVA', 'PERA', 'MANGO', 'PIÑA', 'FRESA', 'NARANJA', 'SANDIA', 'PAPAYA'], 'Colores': ['ROJO', 'AZUL', 'VERDE', 'AMARILLO', 'BLANCO', 'NEGRO', 'ROSADO', 'MORADO']}),
  trivia('edu-animales', E, '🦁', 'Trivia: animales del mundo', '10 preguntas para conocer a los animales.', [
    ['¿Cuál es el animal terrestre más rápido?', ['Caballo', 'Guepardo', 'León', 'Canguro'], 1, 'El guepardo puede correr a más de 100 km/h en distancias cortas.'],
    ['¿Cuál es el animal más grande del mundo?', ['Elefante', 'Jirafa', 'Ballena azul', 'Tiburón blanco'], 2, 'La ballena azul puede medir más de 25 metros.'],
    ['¿Cuántas patas tiene una araña?', ['6', '8', '10', '4'], 1, 'Las arañas tienen 8 patas; por eso no son insectos (ellos tienen 6).'],
    ['¿Qué ave no puede volar y vive en lugares muy fríos?', ['Pingüino', 'Loro', 'Águila', 'Paloma'], 0, 'El pingüino no vuela, ¡pero es un gran nadador!'],
    ['¿Qué animal cambia de color para esconderse?', ['Perro', 'Camaleón', 'Vaca', 'Gallina'], 1, 'El camaleón cambia de color para camuflarse y comunicarse.'],
    ['¿En qué país viven los canguros en libertad?', ['Perú', 'Australia', 'China', 'Egipto'], 1, 'Los canguros son de Australia.'],
    ['¿Cuál es el ave más grande del mundo?', ['Cóndor', 'Avestruz', 'Pavo', 'Pelícano'], 1, 'El avestruz puede medir más de 2 metros, pero no vuela.'],
    ['¿Qué come principalmente el oso panda?', ['Pescado', 'Bambú', 'Carne', 'Miel'], 1, 'El panda come casi solo bambú, ¡muchos kilos al día!'],
    ['¿Qué animal de los Andes aparece en el escudo del Perú?', ['Llama', 'Vicuña', 'Alpaca', 'Cóndor'], 1, 'La vicuña representa la riqueza animal del Perú.'],
    ['¿Cómo se llama la cría de la vaca?', ['Potro', 'Ternero', 'Cordero', 'Cachorro'], 1, 'La cría de la vaca es el ternero (o becerro).'],
  ], 'p1'),
  trivia('edu-mi-cuerpo', E, '🧒', 'Trivia: mi cuerpo', 'Aprende cómo funciona tu cuerpo.', [
    ['¿Con qué parte del cuerpo vemos?', ['Orejas', 'Ojos', 'Nariz', 'Manos'], 1, 'Los ojos nos permiten ver.'],
    ['¿Qué órgano late dentro del pecho?', ['Estómago', 'Corazón', 'Pulmón', 'Hígado'], 1, 'El corazón late para llevar la sangre a todo el cuerpo.'],
    ['¿Con qué sentido sentimos los olores?', ['Gusto', 'Olfato', 'Oído', 'Tacto'], 1, 'Olemos con la nariz: es el sentido del olfato.'],
    ['¿Cuántos sentidos tenemos?', ['3', '5', '7', '10'], 1, 'Vista, oído, olfato, gusto y tacto.'],
    ['¿Qué usamos para masticar la comida?', ['Dientes', 'Uñas', 'Cabello', 'Rodillas'], 0, 'Los dientes cortan y trituran los alimentos.'],
    ['¿Qué debemos hacer antes de comer?', ['Correr', 'Lavarnos las manos', 'Dormir', 'Gritar'], 1, 'Lavarnos las manos nos protege de los microbios.'],
    ['¿Qué parte del cuerpo protege el cerebro?', ['Las costillas', 'El cráneo', 'La rodilla', 'El codo'], 1, 'El cráneo es un hueso duro que protege el cerebro.'],
    ['¿Con qué órganos respiramos?', ['Pulmones', 'Riñones', 'Intestinos', 'Músculos'], 0, 'Los pulmones toman el aire que respiramos.'],
    ['¿Qué sentido usamos al tocar algo suave?', ['Tacto', 'Vista', 'Gusto', 'Oído'], 0, 'Con el tacto sentimos si algo es suave, áspero, frío o caliente.'],
    ['¿Cuántas horas debe dormir un niño más o menos?', ['2 horas', '4 horas', 'De 9 a 11 horas', '20 horas'], 2, 'Los niños necesitan dormir mucho para crecer sanos.'],
  ], 'p1'),
  # ===================== 📐 4.° a 6.° de primaria =====================
  juego('edu-tablas', E, '✖️', 'Reto de tablas de multiplicar', 'Elige una tabla (o todas) y responde rápido.', 'tablas', 'p2'),
  juego('edu-calculo', E, '🧮', 'Cálculo mental', 'Sumas, restas, multiplicaciones y divisiones en 60 segundos.', 'calculo', 'p2'),
  juego('edu-sopa-p2', E, '🔎', 'Sopa de letras: ciencia', 'Encuentra palabras de planetas, ciencia y geografía.', 'sopa', 'p2',
        palabras={'Planetas': ['MERCURIO', 'VENUS', 'TIERRA', 'MARTE', 'JUPITER', 'SATURNO', 'URANO', 'NEPTUNO'], 'Ciencia': ['ATOMO', 'CELULA', 'ENERGIA', 'GRAVEDAD', 'OXIGENO', 'VOLCAN', 'MOLECULA', 'IMAN'], 'Geografía': ['OCEANO', 'MONTAÑA', 'DESIERTO', 'RIO', 'ISLA', 'VALLE', 'LAGUNA', 'SELVA']}),
  trivia('edu-espacio', E, '🪐', 'Trivia: el sistema solar', 'Planetas, estrellas y astronautas.', [
    ['¿Cuál es el planeta más cercano al Sol?', ['Venus', 'Mercurio', 'Tierra', 'Marte'], 1, 'Mercurio es el primer planeta desde el Sol.'],
    ['¿Cuál es el planeta más grande del sistema solar?', ['Saturno', 'Júpiter', 'Neptuno', 'Tierra'], 1, 'Júpiter es tan grande que cabrían más de 1000 Tierras dentro.'],
    ['¿Qué planeta es conocido como el planeta rojo?', ['Marte', 'Venus', 'Urano', 'Mercurio'], 0, 'Marte se ve rojizo por el óxido de hierro de su suelo.'],
    ['¿Cuántos planetas tiene el sistema solar?', ['7', '8', '9', '10'], 1, 'Son 8. Desde 2006, Plutón se considera planeta enano.'],
    ['¿Qué es el Sol?', ['Un planeta', 'Una estrella', 'Un satélite', 'Un cometa'], 1, 'El Sol es una estrella, la más cercana a la Tierra.'],
    ['¿Qué planeta tiene los anillos más visibles?', ['Marte', 'Saturno', 'Mercurio', 'Venus'], 1, 'Los anillos de Saturno están hechos de hielo y roca.'],
    ['¿Cómo se llama el satélite natural de la Tierra?', ['Sol', 'Luna', 'Marte', 'Estrella Polar'], 1, 'La Luna gira alrededor de la Tierra.'],
    ['¿Quién fue el primer ser humano en pisar la Luna?', ['Yuri Gagarin', 'Neil Armstrong', 'Buzz Aldrin', 'Galileo Galilei'], 1, 'Neil Armstrong pisó la Luna en 1969.'],
    ['¿Cuánto tarda la Tierra en dar una vuelta al Sol?', ['Un día', 'Un mes', 'Un año', 'Una semana'], 2, 'Tarda unos 365 días: eso es un año.'],
    ['¿Cuál es el planeta más caliente?', ['Mercurio', 'Venus', 'Marte', 'Júpiter'], 1, 'Venus es el más caliente por su atmósfera muy densa, aunque Mercurio esté más cerca del Sol.'],
  ], 'p2'),
  trivia('edu-ciencias', E, '🔬', 'Trivia: ciencias naturales', 'Plantas, agua, fuerzas y más.', [
    ['¿Qué gas toman las plantas del aire para hacer la fotosíntesis?', ['Oxígeno', 'Dióxido de carbono', 'Nitrógeno', 'Helio'], 1, 'Las plantas usan dióxido de carbono, agua y luz para fabricar su alimento.'],
    ['¿A qué temperatura hierve el agua a nivel del mar?', ['50 °C', '100 °C', '0 °C', '200 °C'], 1, 'A nivel del mar el agua hierve a 100 °C (en la altura hierve a menos).'],
    ['Cuando el agua se congela, ¿en qué estado está?', ['Líquido', 'Gaseoso', 'Sólido', 'Plasma'], 2, 'El hielo es agua en estado sólido.'],
    ['¿Qué parte de la planta absorbe el agua del suelo?', ['Hoja', 'Flor', 'Raíz', 'Fruto'], 2, 'La raíz absorbe agua y minerales.'],
    ['¿Cuál de estos animales es un mamífero?', ['Tiburón', 'Ballena', 'Pulpo', 'Pingüino'], 1, 'La ballena respira aire y alimenta a sus crías con leche.'],
    ['¿Cuántas patas tiene un insecto?', ['4', '6', '8', '10'], 1, 'Todos los insectos tienen 6 patas.'],
    ['¿Qué tipo de animal es la rana?', ['Reptil', 'Anfibio', 'Mamífero', 'Ave'], 1, 'La rana es anfibio: vive en el agua y en la tierra.'],
    ['¿Qué fuerza hace que las cosas caigan al suelo?', ['Magnetismo', 'Gravedad', 'Fricción', 'Electricidad'], 1, 'La gravedad atrae los objetos hacia la Tierra.'],
    ['¿Cuál es la fórmula del agua?', ['CO2', 'H2O', 'O2', 'NaCl'], 1, 'El agua tiene dos átomos de hidrógeno y uno de oxígeno.'],
    ['¿Qué produce la abeja?', ['Leche', 'Miel', 'Seda', 'Lana'], 1, 'Las abejas producen miel a partir del néctar de las flores.'],
  ], 'p2'),
  trivia('edu-ortografia', E, '✍️', 'Ortografía: ¿cómo se escribe?', 'Elige la forma correcta de escribir.', [
    ['¿Cuál está bien escrita?', ['Haber si vienes', 'A ver si vienes', 'Aver si vienes', 'Haver si vienes'], 1, '"A ver" viene de "ver"; "haber" es un verbo (por ejemplo, "va a haber fiesta").'],
    ['¿Cómo se escribe el animal que da leche?', ['Baca', 'Vaca', 'Vacca', 'Bacca'], 1, 'Vaca se escribe con V.'],
    ['¿Qué palabra lleva tilde?', ['Casa', 'Arbol', 'Mesa', 'Perro'], 1, 'Se escribe "árbol": es grave y no termina en n, s ni vocal.'],
    ['¿Cuál es correcta?', ['Hubieron muchas personas', 'Hubo muchas personas', 'Habían muchas personas', 'Hubos muchas personas'], 1, 'El verbo "haber" en ese sentido va siempre en singular: "hubo".'],
    ['¿Cuál está bien escrita?', ['Ice la tarea', 'Hice la tarea', 'Hise la tarea', 'Ise la tarea'], 1, '"Hice" viene del verbo hacer, que lleva h.'],
    ['¿Cuál es correcta en una pregunta?', ['¿Porque no viniste?', '¿Por qué no viniste?', '¿Porqué no viniste?', '¿Por que no viniste?'], 1, 'En preguntas se escribe separado y con tilde: "por qué".'],
    ['¿Cuál está bien escrita?', ['Examenes', 'Exámenes', 'Exámemes', 'Exsámenes'], 1, '"Exámenes" es esdrújula: todas las esdrújulas llevan tilde.'],
    ['Completa: "Espero que te ___ bien"', ['valla', 'vaya', 'baya', 'balla'], 1, '"Vaya" es del verbo ir. "Valla" es una cerca y "baya" es un fruto.'],
    ['¿Cuál es correcta?', ['Te hecho de menos', 'Te echo de menos', 'Te ecsho de menos', 'Te hechó de menos'], 1, '"Echar de menos" va sin h; "hecho" es del verbo hacer.'],
    ['¿Cuál está bien escrita?', ['Sapato', 'Zapato', 'Zapatto', 'Capato'], 1, 'Zapato se escribe con z.'],
  ], 'p2'),
  # ===================== 🧪 Secundaria =====================
  juego('edu-ecuaciones', E, '🟰', 'Ecuaciones: halla x', 'Resuelve ecuaciones de primer grado contra el reloj.', 'ecuaciones', 'sec'),
  trivia('edu-america', E, '🌎', 'Capitales de América', '¿Sabes la capital de cada país?', [
    ['¿Cuál es la capital de Argentina?', ['Córdoba', 'Buenos Aires', 'Rosario', 'Mendoza'], 1, 'Buenos Aires es la capital de Argentina.'],
    ['¿Cuál es la capital de Chile?', ['Valparaíso', 'Santiago', 'Concepción', 'Antofagasta'], 1, 'Santiago es la capital de Chile.'],
    ['¿Cuál es la capital de Colombia?', ['Medellín', 'Cali', 'Bogotá', 'Cartagena'], 2, 'Bogotá está a unos 2600 metros de altura.'],
    ['¿Cuál es la capital de Ecuador?', ['Guayaquil', 'Quito', 'Cuenca', 'Loja'], 1, 'Quito es la capital; Guayaquil es la ciudad más poblada.'],
    ['¿Cuál es la capital de Brasil?', ['Río de Janeiro', 'São Paulo', 'Brasilia', 'Salvador'], 2, 'Brasilia es la capital desde 1960.'],
    ['¿Cuál es la capital de México?', ['Guadalajara', 'Monterrey', 'Ciudad de México', 'Cancún'], 2, 'La Ciudad de México es una de las urbes más grandes del mundo.'],
    ['¿Cuál es la capital de Venezuela?', ['Maracaibo', 'Caracas', 'Valencia', 'Mérida'], 1, 'Caracas es la capital de Venezuela.'],
    ['¿Cuál es la capital de Uruguay?', ['Montevideo', 'Punta del Este', 'Salto', 'Colonia'], 0, 'Montevideo es la capital de Uruguay.'],
    ['¿Cuál es la capital de Paraguay?', ['Asunción', 'Encarnación', 'Ciudad del Este', 'Luque'], 0, 'Asunción es la capital de Paraguay.'],
    ['¿Cuál es la capital de Canadá?', ['Toronto', 'Montreal', 'Ottawa', 'Vancouver'], 2, 'Ottawa es la capital, aunque Toronto sea más grande.'],
  ], 'sec'),
  trivia('edu-historia', E, '🏛️', 'Trivia: historia universal', 'Grandes hechos de la historia del mundo.', [
    ['¿En qué año llegó Cristóbal Colón a América?', ['1492', '1521', '1810', '1300'], 0, 'Colón llegó a América el 12 de octubre de 1492.'],
    ['¿Qué civilización construyó las pirámides de Giza?', ['Romana', 'Egipcia', 'Maya', 'China'], 1, 'Las pirámides de Giza fueron construidas por los antiguos egipcios.'],
    ['¿En qué país está la Gran Muralla?', ['Japón', 'China', 'India', 'Mongolia'], 1, 'La Gran Muralla está en China.'],
    ['¿Quién fue el primer presidente de Estados Unidos?', ['Abraham Lincoln', 'George Washington', 'Thomas Jefferson', 'John Adams'], 1, 'George Washington gobernó de 1789 a 1797.'],
    ['¿En qué año terminó la Segunda Guerra Mundial?', ['1918', '1939', '1945', '1950'], 2, 'Terminó en 1945.'],
    ['¿Qué imperio tenía su capital en el Cusco?', ['Azteca', 'Maya', 'Inca', 'Olmeca'], 2, 'El Cusco fue la capital del Tahuantinsuyo, el Imperio inca.'],
    ['¿Quién pintó la Mona Lisa?', ['Miguel Ángel', 'Leonardo da Vinci', 'Picasso', 'Van Gogh'], 1, 'Leonardo da Vinci la pintó a inicios del siglo XVI.'],
    ['¿Qué inventó Johannes Gutenberg hacia 1450?', ['El telescopio', 'La imprenta de tipos móviles', 'La brújula', 'El reloj'], 1, 'Su imprenta permitió difundir libros como nunca antes.'],
    ['¿Qué cayó en Alemania en 1989?', ['El Muro de Berlín', 'La Torre Eiffel', 'El Coliseo', 'El Partenón'], 0, 'La caída del Muro de Berlín marcó el fin de la Guerra Fría.'],
    ['¿Qué civilización creó los Juegos Olímpicos antiguos?', ['Griega', 'Romana', 'Persa', 'Egipcia'], 0, 'Comenzaron en Olimpia, Grecia, hace casi 2800 años.'],
  ], 'sec'),
  trivia('edu-quimica', E, '⚗️', 'Trivia: química básica', 'Elementos, símbolos y reacciones.', [
    ['¿Cuál es el símbolo químico del oxígeno?', ['Ox', 'O', 'Og', 'Oi'], 1, 'El oxígeno se representa con O.'],
    ['¿Cuál es el símbolo químico del oro?', ['Or', 'Au', 'Ag', 'Go'], 1, 'Au viene del latín "aurum".'],
    ['¿Qué elemento tiene el símbolo Fe?', ['Flúor', 'Hierro', 'Fósforo', 'Francio'], 1, 'Fe viene del latín "ferrum": hierro.'],
    ['¿Qué partícula del átomo tiene carga negativa?', ['Protón', 'Neutrón', 'Electrón', 'Núcleo'], 2, 'El electrón tiene carga negativa.'],
    ['¿Cuál es el pH del agua pura?', ['0', '7', '14', '3'], 1, 'El agua pura es neutra: pH 7.'],
    ['¿Qué gas es el más abundante en el aire?', ['Oxígeno', 'Nitrógeno', 'Dióxido de carbono', 'Hidrógeno'], 1, 'El nitrógeno forma cerca del 78% del aire.'],
    ['¿Cómo se llama la sal de mesa en química?', ['Cloruro de sodio', 'Carbonato de calcio', 'Ácido acético', 'Sulfato de cobre'], 0, 'Su fórmula es NaCl.'],
    ['¿Qué científico ordenó la tabla periódica en 1869?', ['Isaac Newton', 'Dmitri Mendeléiev', 'Marie Curie', 'Albert Einstein'], 1, 'Mendeléiev organizó los elementos por sus propiedades.'],
    ['¿Cuál es el elemento más ligero?', ['Helio', 'Hidrógeno', 'Litio', 'Carbono'], 1, 'El hidrógeno es el elemento más ligero y abundante del universo.'],
    ['El vinagre es un ejemplo de sustancia…', ['Ácida', 'Básica', 'Neutra', 'Metálica'], 0, 'El vinagre contiene ácido acético.'],
  ], 'sec'),
  trivia('edu-literatura', E, '📚', 'Trivia: literatura', 'Autores y obras famosas.', [
    ['¿Quién escribió "Don Quijote de la Mancha"?', ['Lope de Vega', 'Miguel de Cervantes', 'Garcilaso', 'Quevedo'], 1, 'Cervantes publicó la primera parte en 1605.'],
    ['¿Quién escribió "Cien años de soledad"?', ['Mario Vargas Llosa', 'Gabriel García Márquez', 'Julio Cortázar', 'Pablo Neruda'], 1, 'García Márquez, colombiano, ganó el Premio Nobel en 1982.'],
    ['¿Qué escritor peruano ganó el Premio Nobel de Literatura en 2010?', ['César Vallejo', 'Mario Vargas Llosa', 'Ricardo Palma', 'José María Arguedas'], 1, 'Mario Vargas Llosa recibió el Nobel en 2010.'],
    ['¿Quién escribió "Los heraldos negros"?', ['César Vallejo', 'Chabuca Granda', 'Ciro Alegría', 'Abraham Valdelomar'], 0, 'Es un poemario de César Vallejo, de 1918.'],
    ['¿Quién escribió "Romeo y Julieta"?', ['William Shakespeare', 'Charles Dickens', 'Victor Hugo', 'Homero'], 0, 'Es una tragedia de Shakespeare.'],
    ['¿Qué autor peruano escribió las "Tradiciones peruanas"?', ['Ricardo Palma', 'Manuel González Prada', 'Ciro Alegría', 'Julio Ramón Ribeyro'], 0, 'Ricardo Palma escribió relatos sobre la historia del Perú.'],
    ['¿Quién es el autor de la "Ilíada"?', ['Virgilio', 'Homero', 'Sófocles', 'Platón'], 1, 'Se atribuye al poeta griego Homero.'],
    ['¿Qué poeta chileno escribió "Veinte poemas de amor y una canción desesperada"?', ['Gabriela Mistral', 'Pablo Neruda', 'Vicente Huidobro', 'Nicanor Parra'], 1, 'Neruda la publicó en 1924.'],
    ['¿Quién escribió "El principito"?', ['Antoine de Saint-Exupéry', 'Julio Verne', 'Hans Christian Andersen', 'Lewis Carroll'], 0, 'Saint-Exupéry lo publicó en 1943.'],
    ['¿Qué escritor peruano escribió "Los ríos profundos"?', ['José María Arguedas', 'Ciro Alegría', 'Alfredo Bryce', 'Ricardo Palma'], 0, 'Arguedas retrató el mundo andino.'],
  ], 'sec'),
  # ===================== 🎓 Instituto y universidad =====================
  juego('edu-porcentajes', E, '💯', 'Porcentajes y regla de tres', 'Descuentos, porcentajes y proporciones: cálculo mental rápido.', 'porcentajes', 'sup'),
  trivia('edu-logica', E, '🧠', 'Razonamiento lógico', 'Series, deducciones y problemas de ingenio.', [
    ['Continúa la serie: 2, 4, 8, 16, …', ['18', '24', '32', '30'], 2, 'Cada número se multiplica por 2.'],
    ['Continúa la serie: 1, 1, 2, 3, 5, 8, …', ['11', '12', '13', '15'], 2, 'Es la serie de Fibonacci: cada número es la suma de los dos anteriores.'],
    ['Si todos los gatos son animales y Tom es un gato, entonces…', ['Tom no es animal', 'Tom es un animal', 'Todos los animales son Tom', 'No se sabe'], 1, 'Es un silogismo: lo que vale para todos los gatos vale para Tom.'],
    ['Un tren sale a las 8:15 y llega a las 10:45. ¿Cuánto duró el viaje?', ['2 h 15 min', '2 h 30 min', '2 h 45 min', '3 h'], 1, 'De 8:15 a 10:15 son 2 h, más 30 min.'],
    ['Si hoy es lunes, ¿qué día será dentro de 10 días?', ['Miércoles', 'Jueves', 'Viernes', 'Martes'], 1, '10 días = 1 semana + 3 días: lunes + 3 = jueves.'],
    ['¿Qué número falta? 3, 6, 9, __, 15', ['10', '11', '12', '13'], 2, 'La serie suma 3 cada vez.'],
    ['Si 5 máquinas hacen 5 piezas en 5 minutos, ¿cuánto tardan 100 máquinas en hacer 100 piezas?', ['100 min', '5 min', '20 min', '1 min'], 1, 'Cada máquina hace 1 pieza en 5 minutos; 100 máquinas hacen 100 piezas en esos mismos 5 minutos.'],
    ['¿Cuál es el siguiente: A, C, E, G, …?', ['H', 'I', 'J', 'K'], 1, 'Se salta una letra cada vez.'],
    ['Ana es más alta que Beto y Beto es más alto que Carla. ¿Quién es la más baja?', ['Ana', 'Beto', 'Carla', 'No se sabe'], 2, 'Ana > Beto > Carla.'],
    ['¿Cuántos meses tienen 28 días?', ['1', '6', '12', '2'], 2, 'Todos los meses tienen al menos 28 días.'],
  ], 'sup'),
  trivia('edu-finanzas', E, '💰', 'Finanzas personales', 'Ahorro, intereses, crédito y presupuesto.', [
    ['¿Qué es un presupuesto?', ['Un préstamo', 'Un plan de ingresos y gastos', 'Un impuesto', 'Una tarjeta'], 1, 'Sirve para saber cuánto entra, cuánto sale y cuánto puedes ahorrar.'],
    ['Si ahorras S/ 100 al 10% de interés simple anual, ¿cuánto tienes al año?', ['S/ 101', 'S/ 110', 'S/ 120', 'S/ 200'], 1, '10% de 100 = 10; 100 + 10 = 110.'],
    ['¿Qué es la inflación?', ['La subida general de precios', 'Un tipo de ahorro', 'Un banco', 'Un impuesto a la renta'], 0, 'Con inflación, el mismo dinero alcanza para comprar menos.'],
    ['¿Qué significa TEA en un préstamo o ahorro?', ['Tasa Efectiva Anual', 'Tarifa Especial Anual', 'Total En Ahorro', 'Tasa Estimada Aproximada'], 0, 'La TEA muestra el costo o la ganancia real en un año.'],
    ['¿Qué es un fondo de emergencia?', ['Dinero para gastos imprevistos', 'Un seguro de auto', 'Un préstamo rápido', 'Dinero para vacaciones'], 0, 'Se recomienda ahorrar varios meses de gastos básicos.'],
    ['¿Qué pasa si solo pagas el mínimo de tu tarjeta de crédito?', ['No pagas intereses', 'Pagas muchos intereses y la deuda dura más', 'La deuda desaparece', 'Te devuelven dinero'], 1, 'El saldo restante sigue generando intereses.'],
    ['¿Qué es el interés compuesto?', ['Interés solo sobre el monto inicial', 'Interés que también se calcula sobre los intereses ganados', 'Un impuesto', 'Una comisión fija'], 1, 'Por eso el ahorro de largo plazo crece cada vez más rápido.'],
    ['Si un producto cuesta S/ 200 y tiene 25% de descuento, ¿cuánto pagas?', ['S/ 150', 'S/ 175', 'S/ 125', 'S/ 50'], 0, '25% de 200 = 50; 200 − 50 = 150.'],
    ['¿Qué es diversificar una inversión?', ['Poner todo en una sola cosa', 'Repartir el dinero en distintas opciones', 'Pedir un préstamo', 'Gastar menos'], 1, 'Así reduces el riesgo de perderlo todo.'],
    ['Una regla popular para el presupuesto es la 50/30/20. ¿Qué significa el 20?', ['Gastos fijos', 'Gustos', 'Ahorro', 'Impuestos'], 2, '50% necesidades, 30% gustos y 20% ahorro.'],
  ], 'sup'),
  trivia('edu-tecnologia', E, '💻', 'Informática y tecnología', 'Computadoras, internet e inteligencia artificial.', [
    ['¿Qué significa CPU?', ['Unidad Central de Procesamiento', 'Computadora Personal Útil', 'Control de Programas Universal', 'Copia de Pantalla Única'], 0, 'Es el "cerebro" de la computadora.'],
    ['¿Cuántos bits tiene un byte?', ['4', '8', '16', '10'], 1, '1 byte = 8 bits.'],
    ['¿Qué es la memoria RAM?', ['Memoria de trabajo temporal', 'Un disco duro', 'Una pantalla', 'Un programa'], 0, 'Guarda lo que se está usando y se borra al apagar.'],
    ['¿Qué lenguaje se usa para dar estructura a las páginas web?', ['HTML', 'Excel', 'PDF', 'MP3'], 0, 'HTML organiza el contenido de las páginas.'],
    ['¿Qué significa "phishing"?', ['Un engaño para robar datos', 'Un juego en línea', 'Un antivirus', 'Un tipo de cable'], 0, 'Son mensajes falsos que se hacen pasar por bancos o empresas.'],
    ['¿Qué es una contraseña segura?', ['Tu fecha de nacimiento', '123456', 'Una frase larga con letras, números y símbolos', 'Tu nombre'], 2, 'Mientras más larga y variada, mejor.'],
    ['¿Qué significa "IA"?', ['Internet Avanzado', 'Inteligencia Artificial', 'Información Automática', 'Imagen Animada'], 1, 'Son sistemas que aprenden de datos para realizar tareas.'],
    ['¿Qué es la "nube" en informática?', ['El clima', 'Servidores en internet donde se guardan datos', 'Un virus', 'Un teclado'], 1, 'Guardar en la nube es guardar en servidores remotos.'],
    ['¿Qué es la verificación en dos pasos?', ['Escribir la contraseña dos veces', 'Un segundo código para entrar, además de la contraseña', 'Tener dos cuentas', 'Un tipo de correo'], 1, 'Protege tu cuenta aunque roben tu contraseña.'],
    ['¿Qué unidad es más grande?', ['Megabyte', 'Kilobyte', 'Gigabyte', 'Byte'], 2, 'Byte < Kilobyte < Megabyte < Gigabyte.'],
  ], 'sup'),
  trivia('edu-cultura', E, '🌐', 'Cultura general avanzada', 'Preguntas para universitarios curiosos.', [
    ['¿Quién formuló la teoría de la relatividad?', ['Isaac Newton', 'Albert Einstein', 'Nikola Tesla', 'Stephen Hawking'], 1, 'Einstein publicó la relatividad especial en 1905.'],
    ['¿Qué océano es el más grande?', ['Atlántico', 'Índico', 'Pacífico', 'Ártico'], 2, 'El Pacífico cubre cerca de un tercio de la Tierra.'],
    ['¿Cuál es el idioma con más hablantes nativos?', ['Inglés', 'Chino mandarín', 'Español', 'Hindi'], 1, 'El mandarín tiene más hablantes nativos; el español es segundo.'],
    ['¿Qué significa ONU?', ['Organización de las Naciones Unidas', 'Oficina Nacional Única', 'Organización de Negocios Unidos', 'Orden de Naciones Unificadas'], 0, 'Fue fundada en 1945.'],
    ['¿Quién propuso la teoría de la evolución por selección natural?', ['Gregor Mendel', 'Charles Darwin', 'Louis Pasteur', 'Galileo'], 1, 'Darwin publicó "El origen de las especies" en 1859.'],
    ['¿Cuál es el río más caudaloso del mundo?', ['Nilo', 'Amazonas', 'Misisipi', 'Yangtsé'], 1, 'El Amazonas, que nace en el Perú, es el de mayor caudal.'],
    ['¿Qué filósofo griego fue maestro de Alejandro Magno?', ['Sócrates', 'Platón', 'Aristóteles', 'Pitágoras'], 2, 'Aristóteles fue su tutor.'],
    ['¿En qué año se proclamó la Independencia del Perú?', ['1810', '1821', '1824', '1879'], 1, 'José de San Martín la proclamó el 28 de julio de 1821.'],
    ['¿Qué científica ganó dos Premios Nobel en ciencias distintas?', ['Rosalind Franklin', 'Marie Curie', 'Ada Lovelace', 'Jane Goodall'], 1, 'Marie Curie ganó en Física (1903) y en Química (1911).'],
    ['¿Cuál es la moneda de Japón?', ['Yuan', 'Won', 'Yen', 'Rupia'], 2, 'El yen es la moneda japonesa.'],
  ], 'sup'),

  # ===================== ✝️ CRISTIANOS =====================
  juego('fe-versiculo', F, '📖', 'Versículo del día', 'Un versículo bíblico cada día para leer y compartir en tu estado.', 'versiculo'),
  juego('fe-ordena', F, '🧩', 'Ordena el versículo', 'Toca las palabras en el orden correcto para formar el versículo.', 'ordena'),
  juego('fe-completa', F, '✍️', 'Completa el versículo', '¿Qué palabra falta? Pon a prueba tu memoria bíblica.', 'completa'),
  juego('fe-ahorcado', F, '🔤', 'Ahorcado bíblico', 'Adivina personajes, libros y lugares de la Biblia.', 'ahorcado',
        palabras={'Personajes': ['MOISES', 'DAVID', 'NOE', 'ABRAHAM', 'MARIA', 'PEDRO', 'PABLO', 'ESTER', 'DANIEL', 'JONAS', 'SALOMON', 'RUT'], 'Libros de la Biblia': ['GENESIS', 'EXODO', 'SALMOS', 'PROVERBIOS', 'MATEO', 'MARCOS', 'LUCAS', 'JUAN', 'HECHOS', 'ROMANOS'], 'Lugares': ['BELEN', 'NAZARET', 'JERUSALEN', 'EGIPTO', 'GALILEA', 'JORDAN', 'EDEN', 'BETANIA']}),
  juego('fe-sopa', F, '🔎', 'Sopa de letras bíblica', 'Encuentra personajes, libros y frutos del Espíritu.', 'sopa',
        palabras={'Personajes': ['MOISES', 'DAVID', 'NOE', 'ABRAHAM', 'MARIA', 'PEDRO', 'PABLO', 'ESTER', 'DANIEL', 'JONAS'], 'Frutos del Espíritu': ['AMOR', 'GOZO', 'PAZ', 'BONDAD', 'FE', 'TEMPLANZA', 'BENIGNIDAD'], 'Lugares': ['BELEN', 'NAZARET', 'JERUSALEN', 'EGIPTO', 'GALILEA', 'JORDAN', 'EDEN']}),
  trivia('fe-antiguo', F, '📜', 'Trivia: Antiguo Testamento', 'Noé, Moisés, David y más.', [
    ['¿Quién construyó el arca?', ['Moisés', 'Noé', 'Abraham', 'David'], 1, 'Dios mandó a Noé construir el arca antes del diluvio (Génesis 6).'],
    ['¿En cuántos días creó Dios el mundo, antes de descansar?', ['3', '6', '7', '10'], 1, 'Creó en seis días y descansó el séptimo (Génesis 1–2).'],
    ['¿A quién le habló Dios desde una zarza ardiente?', ['Moisés', 'Elías', 'Jacob', 'Josué'], 0, 'Fue en el monte Horeb (Éxodo 3).'],
    ['¿A qué gigante venció David?', ['Sansón', 'Goliat', 'Saúl', 'Absalón'], 1, 'David lo venció con una honda y una piedra (1 Samuel 17).'],
    ['¿Quién fue arrojado al foso de los leones?', ['Daniel', 'Jonás', 'José', 'Elías'], 0, 'Dios cerró la boca de los leones (Daniel 6).'],
    ['¿Quién fue tragado por un gran pez?', ['Jonás', 'Pedro', 'Noé', 'Isaac'], 0, 'Estuvo tres días y tres noches dentro del pez (Jonás 1–2).'],
    ['¿Cuántas tribus formaban el pueblo de Israel?', ['7', '10', '12', '40'], 2, 'Las doce tribus descienden de los hijos de Jacob.'],
    ['¿Quién fue vendido por sus hermanos y llegó a gobernar en Egipto?', ['José', 'Benjamín', 'Rubén', 'Aarón'], 0, 'José perdonó a sus hermanos (Génesis 37–45).'],
    ['¿Qué mar se abrió para que pasara el pueblo de Israel?', ['Mar Muerto', 'Mar Rojo', 'Mar de Galilea', 'Mar Mediterráneo'], 1, 'Dios abrió el Mar Rojo (Éxodo 14).'],
    ['¿Quién tenía una gran fuerza mientras no se cortara el cabello?', ['Sansón', 'Gedeón', 'Saúl', 'Josué'], 0, 'La historia de Sansón está en Jueces 13–16.'],
  ]),
  trivia('fe-nuevo', F, '✉️', 'Trivia: Nuevo Testamento', 'Los apóstoles, Pablo y la iglesia primitiva.', [
    ['¿En qué ciudad nació Jesús?', ['Nazaret', 'Belén', 'Jerusalén', 'Jericó'], 1, 'Jesús nació en Belén de Judea (Mateo 2:1).'],
    ['¿Cuántos apóstoles eligió Jesús?', ['7', '10', '12', '70'], 2, 'Eligió a doce apóstoles (Lucas 6).'],
    ['¿Quién negó a Jesús tres veces?', ['Juan', 'Pedro', 'Tomás', 'Andrés'], 1, 'Pedro lo negó antes de que cantara el gallo, y luego fue restaurado.'],
    ['¿Quién traicionó a Jesús?', ['Judas Iscariote', 'Pedro', 'Tomás', 'Felipe'], 0, 'Judas lo entregó por treinta piezas de plata.'],
    ['¿Qué apóstol era cobrador de impuestos?', ['Mateo', 'Juan', 'Santiago', 'Pedro'], 0, 'Mateo, también llamado Leví.'],
    ['¿Cuál es el primer libro del Nuevo Testamento?', ['Juan', 'Mateo', 'Hechos', 'Romanos'], 1, 'El Nuevo Testamento empieza con el Evangelio de Mateo.'],
    ['¿Cuál es el último libro de la Biblia?', ['Judas', 'Apocalipsis', 'Hebreos', 'Malaquías'], 1, 'Apocalipsis cierra la Biblia.'],
    ['¿Quién bautizó a Jesús?', ['Pedro', 'Juan el Bautista', 'Pablo', 'Elías'], 1, 'Juan el Bautista lo bautizó en el río Jordán.'],
    ['¿Camino a qué ciudad se convirtió Saulo (Pablo)?', ['Roma', 'Damasco', 'Atenas', 'Corinto'], 1, 'Una luz del cielo lo rodeó camino a Damasco (Hechos 9).'],
    ['¿Cuántos libros tiene el Nuevo Testamento?', ['27', '39', '66', '12'], 0, 'El Nuevo Testamento tiene 27 libros.'],
  ]),
  trivia('fe-jesus', F, '✝️', 'Trivia: la vida de Jesús', 'Su nacimiento, sus milagros y su resurrección.', [
    ['¿Cómo se llamaba la madre de Jesús?', ['Marta', 'María', 'Elisabet', 'Ana'], 1, 'María, esposa de José (Lucas 1).'],
    ['¿En qué río fue bautizado Jesús?', ['Nilo', 'Jordán', 'Éufrates', 'Tigris'], 1, 'Fue bautizado en el río Jordán.'],
    ['Según Juan, ¿cuál fue el primer milagro de Jesús?', ['Caminar sobre el agua', 'Convertir el agua en vino', 'Sanar a un ciego', 'Multiplicar panes'], 1, 'Fue en una boda en Caná de Galilea (Juan 2).'],
    ['¿Cuántos días ayunó Jesús en el desierto?', ['7', '12', '40', '3'], 2, 'Ayunó cuarenta días y cuarenta noches (Mateo 4).'],
    ['¿Con cuántos panes y peces alimentó Jesús a cinco mil personas?', ['5 panes y 2 peces', '7 panes y 3 peces', '2 panes y 5 peces', '12 panes y 12 peces'], 0, 'Con cinco panes y dos peces, y sobraron doce cestas.'],
    ['¿Qué oración enseñó Jesús a sus discípulos?', ['El Padre nuestro', 'El Ave María', 'El Credo', 'El Salmo 23'], 0, 'Está en Mateo 6:9-13.'],
    ['¿A quién resucitó Jesús en Betania?', ['Lázaro', 'Jairo', 'Zaqueo', 'Nicodemo'], 0, 'Lázaro llevaba cuatro días muerto (Juan 11).'],
    ['¿Al cuántos días resucitó Jesús?', ['Al primer día', 'Al tercer día', 'Al séptimo día', 'A los cuarenta días'], 1, 'Resucitó al tercer día.'],
    ['¿Sobre qué caminó Jesús ante sus discípulos?', ['Sobre el fuego', 'Sobre el agua', 'Sobre las nubes', 'Sobre la arena'], 1, 'Caminó sobre el mar de Galilea (Mateo 14).'],
    ['¿Qué oficio tenía José, el esposo de María?', ['Pescador', 'Carpintero', 'Pastor', 'Cobrador de impuestos'], 1, 'José era carpintero (Mateo 13:55).'],
  ]),
  trivia('fe-personajes', F, '👑', 'Trivia: personajes de la Biblia', 'Reyes, profetas y mujeres de fe.', [
    ['¿Quién fue el primer hombre según la Biblia?', ['Abel', 'Adán', 'Noé', 'Set'], 1, 'Dios formó a Adán del polvo de la tierra (Génesis 2).'],
    ['¿Cómo se llamaba la esposa de Abraham?', ['Rebeca', 'Sara', 'Raquel', 'Lea'], 1, 'Sara tuvo a Isaac en su vejez.'],
    ['¿Qué rey fue famoso por su gran sabiduría?', ['Saúl', 'Salomón', 'Acab', 'Herodes'], 1, 'Salomón pidió a Dios sabiduría (1 Reyes 3).'],
    ['¿Qué reina arriesgó su vida para salvar a su pueblo?', ['Jezabel', 'Ester', 'Vasti', 'Betsabé'], 1, 'La historia está en el libro de Ester.'],
    ['¿Quién mató a su hermano Abel?', ['Set', 'Caín', 'Lamec', 'Enoc'], 1, 'Génesis 4 narra la historia de Caín y Abel.'],
    ['¿Quién era el padre de Juan el Bautista?', ['Zacarías', 'José', 'Simeón', 'Nicodemo'], 0, 'Zacarías era sacerdote; su esposa era Elisabet (Lucas 1).'],
    ['¿Qué profeta subió al cielo en un carro de fuego?', ['Eliseo', 'Elías', 'Isaías', 'Jeremías'], 1, 'Elías subió en un torbellino (2 Reyes 2).'],
    ['¿Quién guió al pueblo de Israel después de Moisés?', ['Aarón', 'Josué', 'Caleb', 'Samuel'], 1, 'Josué los llevó a la tierra prometida.'],
    ['¿Cómo se llamaba la suegra de Rut?', ['Noemí', 'Orfa', 'Ana', 'Débora'], 0, 'Rut le dijo: "tu pueblo será mi pueblo" (Rut 1).'],
    ['¿Quién escribió muchas cartas a las iglesias del Nuevo Testamento?', ['Pedro', 'Pablo', 'Lucas', 'Santiago'], 1, 'Pablo escribió cartas como Romanos, Corintios y Gálatas.'],
  ]),
  trivia('fe-parabolas', F, '🌾', 'Trivia: milagros y parábolas', 'Las enseñanzas de Jesús.', [
    ['En la parábola, ¿qué hijo volvió a casa después de malgastar su herencia?', ['El hijo mayor', 'El hijo pródigo', 'El hijo sabio', 'El hijo pastor'], 1, 'Su padre lo recibió con los brazos abiertos (Lucas 15).'],
    ['¿Quién ayudó al hombre herido en el camino, en la parábola de Jesús?', ['Un sacerdote', 'Un levita', 'Un samaritano', 'Un soldado'], 2, 'Es la parábola del buen samaritano (Lucas 10).'],
    ['¿Cuántas ovejas dejó el pastor para buscar la que se perdió?', ['9', '50', '99', '100'], 2, 'Dejó las 99 para buscar la perdida (Lucas 15).'],
    ['¿Qué semilla pequeña usa Jesús para hablar del reino de los cielos?', ['Trigo', 'Mostaza', 'Uva', 'Olivo'], 1, 'Es la más pequeña de las semillas y crece mucho (Mateo 13).'],
    ['¿Qué calmó Jesús cuando estaba en la barca con sus discípulos?', ['Un incendio', 'Una tormenta', 'Una multitud', 'Un terremoto'], 1, 'Reprendió al viento y al mar, y hubo calma (Marcos 4).'],
    ['¿Cómo se llamaba el ciego de Jericó que Jesús sanó?', ['Bartimeo', 'Lázaro', 'Zaqueo', 'Malco'], 0, 'Bartimeo gritó: "¡Hijo de David, ten misericordia de mí!" (Marcos 10).'],
    ['¿Cuántos leprosos sanó Jesús, de los cuales solo uno volvió a agradecer?', ['3', '5', '10', '12'], 2, 'Fueron diez (Lucas 17).'],
    ['En la parábola de las diez vírgenes, ¿cuántas eran prudentes?', ['2', '5', '7', '10'], 1, 'Cinco llevaron aceite para sus lámparas (Mateo 25).'],
    ['¿Sobre qué construyó su casa el hombre prudente?', ['Sobre la arena', 'Sobre la roca', 'Sobre el agua', 'Sobre un monte de paja'], 1, 'La casa sobre la roca resistió la tormenta (Mateo 7).'],
    ['¿Qué le pasó a la higuera sin fruto que Jesús maldijo?', ['Dio fruto', 'Se secó', 'Creció más', 'Floreció'], 1, 'Se secó (Mateo 21).'],
  ]),
  trivia('fe-ninos', F, '🧸', 'Biblia para niños', 'Preguntas fáciles para los más pequeños.', [
    ['¿Cómo se llamaba el jardín donde vivían Adán y Eva?', ['Jardín del Edén', 'Jardín de Belén', 'Jardín de Egipto', 'Jardín del Sol'], 0, 'Dios los puso en el huerto del Edén.'],
    ['¿Qué animal habló con Eva en el jardín?', ['Un león', 'La serpiente', 'Un burro', 'Una paloma'], 1, 'La serpiente la engañó (Génesis 3).'],
    ['¿Qué apareció en el cielo después del diluvio?', ['Una estrella', 'Un arcoíris', 'Un cometa', 'Una nube negra'], 1, 'El arcoíris es la señal de la promesa de Dios (Génesis 9).'],
    ['¿Con qué venció David a Goliat?', ['Con una espada', 'Con una honda y una piedra', 'Con una lanza', 'Con un arco'], 1, '¡Confió en Dios y venció al gigante!'],
    ['¿Dónde pusieron al niño Jesús cuando nació?', ['En una cuna de oro', 'En un pesebre', 'En una cama', 'En un barco'], 1, 'No había lugar en el mesón (Lucas 2:7).'],
    ['¿Qué siguieron los sabios de oriente para encontrar a Jesús?', ['Un río', 'Una estrella', 'Un ángel', 'Un camello'], 1, 'La estrella los guió hasta donde estaba el niño.'],
    ['¿Qué día descansó Dios después de crear el mundo?', ['El primero', 'El tercero', 'El séptimo', 'El quinto'], 2, 'Dios bendijo el séptimo día.'],
    ['¿Qué regalo especial le dio Jacob a su hijo José?', ['Un caballo', 'Una túnica de colores', 'Una corona', 'Una espada'], 1, 'La famosa túnica de colores (Génesis 37).'],
    ['¿Quién subió a un árbol para poder ver a Jesús?', ['Pedro', 'Zaqueo', 'Juan', 'Lázaro'], 1, 'Zaqueo era bajito y se subió a un sicómoro (Lucas 19).'],
    ['¿Cuántos animales de cada clase entraron al arca de Noé?', ['Uno', 'Una pareja (dos)', 'Diez', 'Cien'], 1, 'Entraron de dos en dos, macho y hembra (de los animales limpios, siete parejas).'],
  ]),
  trivia('fe-libros', F, '📚', 'Libros de la Biblia', '¿Conoces el orden y el contenido de los libros?', [
    ['¿Cuál es el primer libro de la Biblia?', ['Éxodo', 'Génesis', 'Mateo', 'Salmos'], 1, 'Génesis significa "origen".'],
    ['¿Cuántos libros tiene la Biblia evangélica?', ['39', '66', '73', '27'], 1, 'Tiene 66 libros (la Biblia católica tiene 73).'],
    ['¿Cuántos libros tiene el Antiguo Testamento en la Biblia evangélica?', ['27', '39', '46', '66'], 1, 'Son 39 (la católica incluye 46).'],
    ['¿Qué libro tiene 150 cantos y oraciones?', ['Proverbios', 'Salmos', 'Cantares', 'Lamentaciones'], 1, 'El libro de los Salmos tiene 150 capítulos.'],
    ['¿Qué libro viene después de Génesis?', ['Levítico', 'Éxodo', 'Números', 'Deuteronomio'], 1, 'Éxodo narra la salida de Egipto.'],
    ['¿Cuáles son los cuatro Evangelios?', ['Mateo, Marcos, Lucas y Juan', 'Pedro, Pablo, Juan y Lucas', 'Hechos, Romanos, Gálatas y Efesios', 'Génesis, Éxodo, Levítico y Números'], 0, 'Cuentan la vida de Jesús.'],
    ['¿Qué libro cuenta la historia de la iglesia primitiva?', ['Hechos', 'Romanos', 'Apocalipsis', 'Hebreos'], 0, 'Hechos de los Apóstoles, escrito por Lucas.'],
    ['¿Qué libro reúne consejos de sabiduría atribuidos a Salomón?', ['Proverbios', 'Job', 'Jueces', 'Números'], 0, 'Proverbios está lleno de consejos prácticos.'],
    ['¿Qué libro cuenta la historia de una joven moabita fiel a su suegra?', ['Ester', 'Rut', 'Judit', 'Jonás'], 1, 'El libro de Rut.'],
    ['¿En qué libro está el famoso capítulo del amor ("el amor es sufrido…")?', ['Romanos', '1 Corintios', 'Gálatas', 'Efesios'], 1, 'Es 1 Corintios 13.'],
  ]),
]

d = json.load(open(RUTA, encoding='utf-8'))
ids = {x['id'] for x in NUEVOS}
d['tests'] = [x for x in d['tests'] if x['id'] not in ids] + NUEVOS
cats = [c for c in d['categorias'] if c[0] not in ('educativos', 'cristianos')]
pos = next((i for i, c in enumerate(cats) if c[0] == 'juegos'), 1) + 1
cats[pos:pos] = [['educativos', '📚 Educativos'], ['cristianos', '✝️ Cristianos']]
d['categorias'] = cats
d['niveles'] = NIVELES
json.dump(d, open(RUTA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('educativos', sum(x['cat'] == E for x in NUEVOS), 'cristianos', sum(x['cat'] == F for x in NUEVOS), 'total tests', len(d['tests']))
