-- Carga del catalogo de ejercicios en public.exercises.
-- Generado por scripts/load-ejercicios.js --sql
--
-- Corre todo en una transaccion y es idempotente: se puede volver a correr.
-- Si algo no cuadra, ABORTA con rollback en vez de dejar la carga a medias.
--
-- Notas de esquema:
--   * exercises no tiene columna region: se hereda de muscle_groups.region.
--     Por eso las 4 excepciones de cuerpo completo van a su propio
--     grupo 'Cuerpo completo' con region 'full'.
--   * 'Pecho' = pectorales y 'Pantorrillas' = gemelos (grupos del seed).
--   * 'Piernas' es nuevo: el catalogo no separa cuadriceps/femorales/gluteos.
--   * exercises.name no tiene restriccion unique, asi que el dedup se hace con
--     not exists comparando lower(btrim(name)).
--   * No se toca ninguna fila existente: los nombres que ya existen se saltan.

begin;

-- Catalogo del script, en memoria. Se descarta al hacer commit.
create temporary table _catalogo (
  grupo        text,
  nombre       text,
  instrucciones text
) on commit drop;

insert into _catalogo (grupo, nombre, instrucciones) values
  ('Pecho', 'Press de banca con barra', 'Acostado en un banco plano, con agarre un poco más ancho que los hombros, bajás la barra hasta rozar el pecho y empujás hasta extender los brazos. Es el ejercicio base para fuerza y masa en pectorales, y también involucra hombros y tríceps como asistencia.'),
  ('Pecho', 'Press banca inclinado con mancuernas', 'En un banco inclinado a 30-45°, empujás las mancuernas desde la altura del pecho hasta arriba, dejando que se acerquen levemente al final. La inclinación traslada más trabajo a la parte superior (clavicular) del pectoral que el press plano.'),
  ('Pecho', 'Aperturas en máquina Peck Deck o Contractora', 'Sentado con la espalda apoyada, juntás los brazos al frente del cuerpo en un arco controlado, sin usar impulso. Al ser un movimiento guiado, permite aislar el pectoral sin depender de hombros o tríceps para empujar.'),
  ('Pecho', 'Cruce de poleas', 'De pie, parado entre dos poleas altas, cruzás los cables por delante del cuerpo con los codos ligeramente flexionados. Mantiene tensión constante en el pectoral durante todo el recorrido, algo que las mancuernas no logran en los extremos del movimiento.'),
  ('Pecho', 'Press de banca inclinado con barra', 'Igual al press inclinado con mancuernas pero con barra, lo que permite manejar más carga total aunque con menor rango de movimiento. Prioriza la porción alta del pecho.'),
  ('Pecho', 'Press de banca con mancuernas', 'Versión del press plano con una mancuerna en cada mano, lo que habilita mayor recorrido al final del movimiento y exige más estabilización de los hombros que con barra.'),
  ('Pecho', 'Aperturas con mancuernas', 'Acostado en banco plano, con los codos levemente flexionados, abrís los brazos hacia los costados en forma de arco y volvés a juntarlos sobre el pecho. Estira bien el pectoral en la fase baja del movimiento.'),
  ('Pecho', 'Aperturas Inclinadas con mancuernas', 'El mismo movimiento que las aperturas planas pero en un banco inclinado, lo que enfatiza más la parte alta del pectoral.'),
  ('Pecho', 'Press de banca en máquina sentado', 'Sentado, empujás las manijas hacia adelante siguiendo un riel fijo. Al ser guiado, es una variante más segura para quienes recién empiezan o entrenan sin compañero.'),
  ('Pecho', 'Press de banca declinado con barra', 'En un banco con inclinación negativa, empujás la barra desde el pecho hacia arriba. El ángulo enfatiza la porción inferior del pectoral.'),
  ('Pecho', 'Press de banca declinado con mancuernas', 'Igual al declinado con barra pero con mancuernas, sumando mayor rango de movimiento y trabajo de estabilización en cada brazo por separado.'),
  ('Pecho', 'Flexiones', 'Apoyado en manos y puntas de pies, con el cuerpo alineado, bajás flexionando los codos hasta casi tocar el piso y volvés a subir. Trabaja pecho, hombros y tríceps usando solo el peso corporal, y se puede regular la dificultad apoyando las rodillas.'),
  ('Espalda', 'Remo con mancuerna a una mano', 'Apoyado con una mano y rodilla sobre un banco, remás la mancuerna desde el piso hacia la cadera, manteniendo la espalda recta. Al trabajar un lado a la vez, ayuda a corregir asimetrías entre dorsal y romboides.'),
  ('Espalda', 'Jalón con agarre ancho', 'Sentado en la máquina, con agarre amplio en la barra, tirás hacia el pecho llevando los codos hacia abajo y atrás. Es uno de los ejercicios más efectivos para ganar ancho de espalda (dorsal ancho).'),
  ('Espalda', 'Remo en máquina', 'Sentado con el pecho apoyado o con soporte, tirás las manijas hacia el abdomen apretando los omóplatos al final. El recorrido guiado facilita concentrarse en la espalda media sin usar impulso de piernas.'),
  ('Espalda', 'Jalón al pecho con agarre cerrado', 'Igual al jalón ancho pero con las manos juntas o con agarre en V, lo que permite mayor rango de movimiento y suma más participación del bíceps.'),
  ('Espalda', 'Remo con barra', 'Inclinado hacia adelante con las rodillas semi-flexionadas, tirás la barra desde el piso hacia el abdomen bajo, manteniendo la columna neutra. Es un ejercicio compuesto clave para ganar grosor en toda la espalda.'),
  ('Espalda', 'Jalón tras nuca', 'Variante del jalón donde la barra baja detrás de la cabeza en vez de al pecho. Requiere buena movilidad de hombro; muchos entrenadores lo evitan por el riesgo en la articulación si falta esa movilidad.'),
  ('Espalda', 'Jalón al pecho con agarre invertido', 'Se toma la barra con las palmas hacia el cuerpo (agarre supino) en vez de hacia adelante. El cambio de agarre suma bastante trabajo de bíceps al mismo movimiento de jalón.'),
  ('Espalda', 'Jalón en polea con cuerda', 'Se sujeta una cuerda en la polea alta y se tira hacia el pecho, separando los extremos de la cuerda al final del recorrido. Esa separación permite una contracción extra en la espalda.'),
  ('Espalda', 'Remo en barra T', 'De pie, con la barra fija en un extremo, remás el otro extremo sosteniendo el peso con un agarre en V o con mancuerna. Genera un fuerte estímulo en la espalda media con buena estabilidad postural.'),
  ('Espalda', 'Remo inclinado con barra con agarre supinado', 'El mismo patrón del remo con barra pero tomando la barra con las palmas hacia arriba, lo que suma trabajo de bíceps y enfatiza más la parte baja del dorsal.'),
  ('Espalda', 'Elevaciones en barra fija', 'Colgado de una barra con agarre pronado, subís el cuerpo hasta que el mentón pase la barra y bajás con control. Es el ejercicio de peso corporal más efectivo para desarrollar el dorsal ancho.'),
  ('Espalda', 'Elevaciones tras nuca en barra fija', 'Dominadas donde la barra se lleva detrás de la nuca en lugar de al pecho. Exige mucha movilidad de hombro y suele desaconsejarse para quienes no la tienen desarrollada.'),
  ('Espalda', 'Elevaciones en barra fija con agarre supinado', 'Dominadas con las palmas hacia el cuerpo (chin-ups), lo que reduce algo la exigencia y suma más trabajo de bíceps que las dominadas tradicionales.'),
  ('Espalda', 'Jalón dorsal con brazos rectos', 'De pie frente a una polea alta, con los brazos extendidos, bajás la barra en arco hasta las caderas sin flexionar los codos. Aísla el dorsal sin que el bíceps tome protagonismo.'),
  ('Espalda', 'Remo inclinado con mancuernas', 'Inclinado hacia adelante, remás dos mancuernas al mismo tiempo llevando los codos hacia atrás. Permite mayor rango de movimiento que la barra y trabaja ambos lados por igual.'),
  ('Espalda', 'Pullover con mancuerna', 'Acostado transversalmente en un banco, sostenés una mancuerna con ambas manos y la llevás desde el pecho hasta detrás de la cabeza en arco. Trabaja dorsal y pectoral a la vez, y ayuda a movilizar la caja torácica.'),
  ('Espalda', 'Pullover con barra', 'Mismo patrón que el pullover con mancuerna pero sosteniendo una barra con ambas manos, lo que da más estabilidad al movimiento.'),
  ('Espalda', 'Peso muerto con barra', 'De pie frente a la barra en el piso, con la espalda recta, extendés cadera y rodillas al mismo tiempo hasta quedar totalmente erguido. Es uno de los ejercicios compuestos más completos, trabajando espalda baja, glúteos, isquiotibiales y agarre.'),
  ('Espalda', 'Peso muerto sumo con barra', 'Variante del peso muerto con las piernas bien separadas y las manos por dentro de las rodillas. El recorrido es más corto y enfatiza más los aductores y glúteos que la versión convencional.'),
  ('Espalda', 'Peso muerto con barra hexagonal', 'Se realiza parado dentro de una barra con forma hexagonal, con las agarraderas a los costados del cuerpo. Esa posición es más amigable para la zona lumbar que el peso muerto tradicional con barra recta.'),
  ('Espalda', 'Peso muerto con mancuernas', 'El mismo patrón de bisagra de cadera pero sosteniendo una mancuerna en cada mano. Es una buena progresión para quienes están aprendiendo el movimiento antes de pasar a la barra.'),
  ('Espalda', 'Encogimiento de hombros con barra', 'De pie, sosteniendo la barra con los brazos extendidos, elevás los hombros hacia las orejas y bajás con control. Aísla el trapecio superior sin flexionar los codos.'),
  ('Espalda', 'Encogimiento de hombros con mancuernas', 'El mismo movimiento pero con una mancuerna en cada mano a los costados del cuerpo, lo que permite un recorrido algo más natural que con barra.'),
  ('Hombros', 'Press de hombro con mancuernas', 'Sentado o de pie, con una mancuerna en cada mano a la altura de los hombros, empujás hacia arriba hasta casi extender los codos. Trabaja el deltoides en sus tres porciones, con énfasis en la parte frontal y lateral.'),
  ('Hombros', 'Elevación lateral con mancuernas', 'De pie, con una leve flexión de codos, elevás los brazos hacia los costados hasta la altura de los hombros y bajás con control. Es el ejercicio de aislamiento más directo para el deltoides lateral, el que da ancho a los hombros.'),
  ('Hombros', 'Elevación frontal con mancuernas', 'De pie, elevás los brazos hacia adelante hasta la altura de los hombros, alternando o con ambos brazos a la vez. Aísla el deltoides anterior, que ya recibe bastante estímulo indirecto en los ejercicios de pecho.'),
  ('Hombros', 'Cruces inversos en polea alta', 'De pie entre dos poleas altas, cruzás los cables llevando los brazos hacia atrás y afuera. Trabaja el deltoides posterior, una zona que suele quedar poco estimulada en rutinas centradas en empuje.'),
  ('Hombros', 'Press de hombros en Máquina Smith', 'Press de hombro con la barra guiada por un riel fijo, lo que quita algo de trabajo de estabilización pero permite concentrarse en empujar con más seguridad, útil si entrenás sin compañero.'),
  ('Hombros', 'Remo alto con barra', 'De pie, tirás la barra pegada al cuerpo desde los muslos hasta la altura del pecho, llevando los codos hacia arriba y afuera. Combina trabajo de deltoides lateral con trapecio.'),
  ('Hombros', 'Elevaciones posteriores para hombros "Pájaro"', 'Inclinado hacia adelante desde la cadera, con mancuernas en las manos, abrís los brazos hacia los costados como si fueran alas. Aísla el deltoides posterior con un patrón similar a las aperturas invertidas.'),
  ('Hombros', 'Elevación lateral con cable a una mano', 'El mismo patrón de elevación lateral pero usando una polea baja, lo que mantiene tensión constante en el deltoides durante todo el recorrido, algo que la mancuerna pierde al final del movimiento.'),
  ('Hombros', 'Press Militar con mancuernas', 'Con una leve flexión de piernas para tomar impulso, empujás las mancuernas por encima de la cabeza. El impulso permite manejar algo más de peso que en el press estricto, siendo más explosivo.'),
  ('Hombros', 'Press Militar', 'La misma idea que el anterior pero con barra, usando el impulso de piernas para ayudar en el empuje por encima de la cabeza.'),
  ('Hombros', 'Elevaciones frontales con cable a una mano', 'Elevación frontal realizada con una polea baja, un brazo a la vez, lo que mantiene tensión constante sobre el deltoides anterior en todo el recorrido.'),
  ('Hombros', 'Elevaciones frontales con barra', 'De pie, sosteniendo la barra con ambas manos, la elevás al frente hasta la altura de los hombros. Trabaja el deltoides anterior con carga bilateral, útil para sumar volumen a esa zona.'),
  ('Hombros', 'Press militar sentado con barra', 'Sentado con la espalda apoyada, empujás la barra desde los hombros hacia arriba. La posición sentada da más estabilidad que hacerlo de pie, lo que permite concentrarse en el empuje.'),
  ('Hombros', 'Press tras nuca sentado', 'Igual al press militar sentado pero bajando la barra por detrás de la cabeza. Exige buena movilidad de hombro para hacerse con seguridad.'),
  ('Hombros', 'Press militar de pie', 'De pie, sin impulso de piernas, empujás la barra desde el pecho por encima de la cabeza. Al no tener el apoyo del impulso, exige mucha estabilidad de core y hombros.'),
  ('Hombros', 'Press militar de pie tras nuca', 'La misma variante de pie pero llevando la barra detrás de la cabeza, lo que suma exigencia de movilidad y suele desaconsejarse frente a otras variantes más seguras.'),
  ('Hombros', 'Elevación frontal con mancuernas alternas agarre neutro', 'Elevación frontal alternando un brazo por vez, con las palmas enfrentadas entre sí (agarre neutro). Al alternar, cada brazo recibe una carga algo menor por repetición.'),
  ('Hombros', 'Elevación frontal con un brazo en polea baja agarre neutro', 'El mismo movimiento pero con polea, un brazo a la vez y agarre neutro, manteniendo tensión constante durante todo el recorrido.'),
  ('Hombros', 'Elevación frontal con mancuerna a dos manos', 'Se sostiene una sola mancuerna con ambas manos, generalmente por el disco, y se eleva al frente. Trabaja ambos deltoides anteriores de forma simultánea con una sola pieza de peso.'),
  ('Bíceps', 'Curl con barra', 'De pie, con agarre supino a la altura de los hombros, flexionás los codos llevando la barra hacia el pecho sin mover los brazos del torso. Es el ejercicio base para desarrollar masa en el bíceps.'),
  ('Bíceps', 'Curl alterno con mancuernas', 'De pie, flexionás un brazo por vez, girando la muñeca hacia afuera (supinando) a medida que subís la mancuerna. Esa rotación suma trabajo extra al bíceps respecto de un curl con agarre fijo.'),
  ('Bíceps', 'Curl con cuerda en polea', 'Con una cuerda en la polea baja, flexionás los codos llevándola hacia el pecho. La polea mantiene tensión constante en el bíceps durante todo el movimiento, a diferencia de las mancuernas.'),
  ('Bíceps', 'Curl con barra EZ', 'El mismo curl de bíceps pero con una barra de agarre en zigzag, lo que reduce la tensión sobre la muñeca respecto a una barra recta.'),
  ('Bíceps', 'Curl de predicador con barra EZ', 'Sentado, con el brazo apoyado sobre un banco inclinado (banco predicador), flexionás el codo sin poder usar impulso del cuerpo. Aísla fuertemente el bíceps al eliminar el balanceo.'),
  ('Bíceps', 'Curl alterno de martillo con mancuernas', 'Curl realizado con las palmas enfrentadas entre sí (agarre neutro) durante todo el movimiento. Además del bíceps, trabaja fuerte el músculo braquial, que da grosor al brazo.'),
  ('Bíceps', 'Curl inclinado con mancuernas', 'Sentado en un banco inclinado hacia atrás, con los brazos colgando detrás del torso, flexionás los codos. La posición del brazo detrás del cuerpo aumenta el estiramiento inicial del bíceps.'),
  ('Bíceps', 'Curl concentrado con mancuernas', 'Sentado, apoyás la parte trasera del brazo contra la cara interna del muslo y flexionás el codo sosteniendo una mancuerna. Al fijar el brazo, es de los ejercicios que más aíslan el bíceps.'),
  ('Bíceps', 'Curl de cable en polea baja a una mano', 'Con una polea baja y agarre individual, flexionás el codo un brazo a la vez. La polea da tensión constante y permite ajustar mejor el ángulo de trabajo que con mancuerna.'),
  ('Bíceps', 'Curl de cable con barra recta en polea baja', 'El mismo curl con polea baja pero usando una barra recta con ambas manos, sumando tensión constante a un movimiento bilateral.'),
  ('Bíceps', 'Curl de cable en polea alta de pie', 'Con las poleas ubicadas por encima de la altura del hombro, se hace el curl llevando las manos hacia la cabeza. El ángulo desde arriba cambia el énfasis dentro del bíceps respecto al curl tradicional.'),
  ('Bíceps', 'Curl de muñeca con barra sentado', 'Sentado, con los antebrazos apoyados sobre los muslos y las manos colgando fuera de las rodillas, flexionás solo las muñecas sosteniendo la barra. Fortalece los músculos flexores del antebrazo.'),
  ('Bíceps', 'Extensión de muñeca con barra sentado', 'La misma posición que el curl de muñeca pero moviendo la barra en sentido contrario (extendiendo la muñeca hacia arriba). Trabaja los extensores del antebrazo, útiles para equilibrar el desarrollo del brazo.'),
  ('Bíceps', 'Curl de barra invertido', 'Curl de bíceps tomando la barra con las palmas hacia abajo (agarre pronado). Al cambiar el agarre, el énfasis pasa más al antebrazo y al músculo braquiorradial.'),
  ('Tríceps', 'Extensión de tríceps tumbado', 'Acostado en un banco, con la barra sostenida por encima del pecho, bajás flexionando solo los codos hasta acercarla a la frente y volvés a extender. Se lo conoce popularmente como "press francés" y es muy efectivo para toda la cabeza del tríceps.'),
  ('Tríceps', 'Extensión de tríceps en polea', 'De pie frente a una polea alta, con una barra recta o angulada, empujás hacia abajo extendiendo los codos sin moverlos del torso. Es de los ejercicios de aislamiento más usados para tríceps por lo simple de ejecutar.'),
  ('Tríceps', 'Extensión de tríceps en polea con cuerda', 'El mismo movimiento que el anterior pero con una cuerda, separando los extremos hacia afuera al final del recorrido. Esa separación suma una contracción extra al tríceps.'),
  ('Tríceps', 'Extensión de tríceps con mancuernas por encima de la cabeza', 'De pie o sentado, sosteniendo una mancuerna con ambas manos detrás de la cabeza, extendés los brazos hacia arriba. Al trabajar por encima de la cabeza, estira bien la cabeza larga del tríceps.'),
  ('Tríceps', 'Press Banca con agarre cerrado', 'Press de banca tradicional pero con las manos separadas apenas al ancho de los hombros o menos. Al cerrar el agarre, buena parte del trabajo pasa del pecho al tríceps.'),
  ('Tríceps', 'Patadas traseras', 'Inclinado hacia adelante desde la cadera, con el brazo pegado al torso, extendés el codo llevando la mancuerna hacia atrás. Aísla el tríceps especialmente en la fase final del movimiento.'),
  ('Tríceps', 'Extensión de tríceps con cable de agarre inverso con barra', 'Extensión en polea alta pero tomando la barra con agarre supino (palmas hacia arriba). El cambio de agarre modifica levemente qué porción del tríceps recibe más estímulo.'),
  ('Tríceps', 'Extensión de tríceps con cable a una mano', 'El mismo patrón de extensión en polea pero trabajando un brazo a la vez. Permite corregir diferencias de fuerza entre ambos lados.'),
  ('Tríceps', 'Extensión de tríceps con cable a una mano con agarre supinado', 'Variante de la anterior con la palma hacia arriba en vez de hacia abajo, cambiando el ángulo de trabajo del antebrazo y muñeca.'),
  ('Tríceps', 'Extensión de tríceps con mancuernas tumbado', 'Acostado, con una mancuerna en cada mano, bajás hacia los lados de la cabeza flexionando los codos y volvés a extender. Es similar al press francés pero permite mayor libertad de movimiento en cada brazo.'),
  ('Tríceps', 'Press francés sentado con barra', 'Sentado con la espalda recta, bajás la barra detrás de la cabeza flexionando los codos y volvés a extender por encima. Genera bastante tensión sobre la cabeza larga del tríceps.'),
  ('Tríceps', 'Fondos en banco', 'Apoyado de espaldas con las manos en el borde de un banco y los pies apoyados en el piso o en otro banco, bajás flexionando los codos y volvés a subir. Es un ejercicio de peso corporal accesible para tríceps, regulable moviendo los pies más cerca o lejos.'),
  ('Tríceps', 'Fondos en barras paralelas', 'Suspendido con los brazos extendidos entre dos barras paralelas, bajás el cuerpo flexionando los codos y volvés a subir. Es un ejercicio compuesto exigente que trabaja fuerte tríceps y pecho.'),
  ('Abdominales', 'Crunch', 'Acostado boca arriba con las rodillas flexionadas, flexionás el torso llevando los hombros hacia las rodillas sin despegar la zona lumbar del piso. Es el ejercicio más básico para el recto abdominal.'),
  ('Abdominales', 'Crunch oblicuo', 'Similar al crunch tradicional pero llevando un codo hacia la rodilla contraria en cada repetición. La rotación del torso suma trabajo directo a los músculos oblicuos.'),
  ('Abdominales', 'Abdominales en máquina', 'Sentado en la máquina específica, flexionás el torso hacia adelante contra una resistencia ajustable. Al poder regular la carga, permite progresar de forma más controlada que con el peso corporal solo.'),
  ('Abdominales', 'Abdominales con cuerda en polea alta', 'De rodillas frente a una polea alta, sosteniendo una cuerda a los lados de la cabeza, flexionás el torso hacia abajo curvando la espalda. La resistencia de la polea permite sumar carga progresiva al movimiento de crunch.'),
  ('Abdominales', 'Plancha', 'Apoyado en los antebrazos y las puntas de los pies, mantenés el cuerpo en línea recta sin dejar caer la cadera. Es un ejercicio isométrico (sin movimiento) que exige a todo el core, incluyendo abdomen, zona lumbar y glúteos.'),
  ('Abdominales', 'Elevación de piernas', 'Colgado de una barra fija, con los brazos extendidos, elevás las piernas rectas o flexionadas hacia el pecho y bajás con control. Se enfoca principalmente en la parte baja del abdomen, más difícil de estimular con crunches.'),
  ('Abdominales', 'Encogimientos de rodillas para abdominales', 'Acostado boca arriba, llevás las rodillas flexionadas hacia el pecho sin usar impulso de piernas. Es una variante más simple que la elevación de piernas rectas para trabajar la zona baja del abdomen.'),
  ('Abdominales', 'Abdominales con brazos estirados', 'Se hace el crunch tradicional pero con los brazos extendidos por encima de la cabeza en vez de cruzados sobre el pecho. Al alargar el brazo de palanca, aumenta la dificultad del mismo movimiento.'),
  ('Abdominales', 'Plancha con flexión', 'Desde la posición de plancha con antebrazos, subís alternando a apoyo de manos extendidas y volvés a bajar. Suma un componente dinámico y de estabilidad de hombros al trabajo isométrico de la plancha.'),
  ('Piernas', 'Sentadilla', 'De pie con la barra apoyada en la espalda alta, flexionás cadera y rodillas bajando el cuerpo como si te fueras a sentar, y volvés a subir. Es el ejercicio base de piernas, trabajando cuádriceps, glúteos e isquiotibiales en conjunto.'),
  ('Piernas', 'Prensa de piernas', 'Sentado o recustado en la máquina, empujás la plataforma con ambas piernas hasta casi extender las rodillas. Es una variante guiada de la sentadilla que permite cargar bastante peso con menor exigencia de equilibrio.'),
  ('Piernas', 'Extensión de piernas', 'Sentado en la máquina, con las piernas flexionadas a 90°, extendés las rodillas contra resistencia hasta casi estirarlas del todo. Aísla directamente el cuádriceps sin involucrar cadera ni isquiotibiales.'),
  ('Piernas', 'Zancada', 'De pie, das un paso largo hacia adelante y bajás flexionando ambas rodillas hasta que la de atrás casi toque el piso. Trabaja cuádriceps y glúteo de cada pierna por separado, exigiendo también equilibrio.'),
  ('Piernas', 'Curl de pierna tumbado en máquina de femoral', 'Acostado boca abajo en la máquina, con el rodillo apoyado detrás de los tobillos, flexionás las rodillas llevando los talones hacia los glúteos. Aísla los isquiotibiales en la parte trasera del muslo.'),
  ('Piernas', 'Sentadilla Hack', 'En una máquina inclinada donde la espalda queda apoyada contra un respaldo, hacés el movimiento de sentadilla empujando una plataforma. Enfatiza el cuádriceps con menor exigencia sobre la zona lumbar que la sentadilla libre.'),
  ('Piernas', 'Curl de piernas sentado', 'Sentado en la máquina con las piernas extendidas al frente, flexionás las rodillas contra resistencia hacia abajo. Es la variante sentada del curl femoral, trabajando los mismos músculos desde otro ángulo.'),
  ('Piernas', 'Extensión a una pierna', 'El mismo movimiento que la extensión de piernas pero trabajando una pierna a la vez. Sirve para identificar y corregir diferencias de fuerza entre ambos lados.'),
  ('Piernas', 'Sentadilla frontal', 'Sentadilla con la barra apoyada al frente de los hombros en vez de en la espalda. Esa posición exige más del core para mantener el torso erguido y traslada más carga al cuádriceps.'),
  ('Piernas', 'Peso muerto rumano (piernas rectas) con mancuernas', 'De pie, con las rodillas apenas flexionadas, bajás las mancuernas por delante de las piernas manteniendo la espalda recta hasta sentir el estiramiento en los isquiotibiales. Es clave para el desarrollo de la cadena posterior de la pierna.'),
  ('Piernas', 'Peso muerto rumano (piernas rectas) con barra', 'El mismo patrón de bisagra de cadera que la versión con mancuernas, pero sosteniendo una barra con ambas manos por delante del cuerpo.'),
  ('Piernas', 'Sentadilla Goblet con mancuerna', 'Sosteniendo una mancuerna verticalmente contra el pecho con ambas manos, hacés el movimiento de sentadilla. Es una buena variante para aprender la técnica correcta antes de sumar más carga.'),
  ('Cuerpo completo', 'Salto Rodillas al Pecho', 'Desde parado, saltás llevando ambas rodillas hacia el pecho en el punto más alto del salto. Es un ejercicio explosivo (pliométrico) que exige potencia de piernas y activación fuerte del core.'),
  ('Cuerpo completo', 'Burpees', 'Combina en un solo movimiento una sentadilla, apoyo en plancha, una flexión y un salto final. Es un ejercicio de cuerpo completo muy exigente cardiovascularmente, además de trabajar piernas y core.'),
  ('Piernas', 'Sentadillas con propio peso', 'El movimiento básico de sentadilla sin ninguna carga externa, solo el peso del cuerpo. Es ideal para aprender la técnica desde cero o para trabajar resistencia muscular con muchas repeticiones.'),
  ('Piernas', '1.5 repeticiones de sentadillas con propio peso', 'Bajás a la posición completa de sentadilla, subís solo hasta la mitad del recorrido, volvés a bajar del todo y recién ahí subís completamente: eso cuenta como una repetición y media. Aumenta bastante el tiempo bajo tensión del cuádriceps.'),
  ('Piernas', 'Sentadillas con balón medicinal', 'El mismo movimiento de sentadilla sosteniendo un balón medicinal al frente del pecho o entre las manos. Suma una resistencia extra accesible sin necesidad de barra o mancuernas.'),
  ('Piernas', 'Sentadilla búlgara con barra', 'Con un pie apoyado atrás sobre un banco y la barra en la espalda, bajás flexionando la pierna de adelante hasta casi tocar el piso con la rodilla trasera. Genera un fuerte trabajo unilateral de cuádriceps y glúteo.'),
  ('Piernas', 'Sentadilla búlgara con propio peso', 'El mismo ejercicio que el anterior pero sin carga externa, apoyando solo el pie trasero en el banco. Es una buena progresión antes de sumar peso.'),
  ('Piernas', 'Sentadilla con mini banda', 'Se hace la sentadilla tradicional con una banda elástica pequeña rodeando ambas rodillas, lo que obliga a empujarlas hacia afuera durante todo el movimiento. Activa fuerte el glúteo medio y los estabilizadores de cadera.'),
  ('Cuerpo completo', 'Sentadilla con salto', 'Sentadilla que, en vez de terminar de pie, se completa con un salto vertical explosivo desde abajo. Desarrolla potencia de piernas además de fuerza.'),
  ('Piernas', 'Sentadilla isométrico apoyado sobre la pared', 'Te apoyás con la espalda contra la pared y bajás hasta quedar en posición de sentadilla, sosteniendo esa posición estática por un tiempo determinado. Es un ejercicio de resistencia muscular para el cuádriceps sin necesidad de equipamiento.'),
  ('Piernas', 'Peso muerto con balón medicinal', 'Se realiza el mismo patrón de bisagra de cadera del peso muerto pero sosteniendo un balón medicinal en vez de barra o mancuernas. Es una variante accesible para aprender el movimiento con carga baja.'),
  ('Piernas', 'Peso muerto a una pierna', 'De pie apoyado en una sola pierna, inclinás el torso hacia adelante mientras la otra pierna se eleva hacia atrás, manteniendo la espalda recta. Exige equilibrio además de trabajar glúteo e isquiotibiales de forma unilateral.'),
  ('Piernas', 'Sentadilla sumo con kettlebell', 'Con las piernas bien separadas y los pies apuntando hacia afuera, sostenés una kettlebell con ambas manos entre las piernas y hacés la sentadilla. Esa postura amplia enfatiza más los aductores y glúteos que una sentadilla tradicional.'),
  ('Piernas', 'Ejercicio "buenos días" con barra', 'Con la barra apoyada en la espalda alta como en la sentadilla, inclinás el torso hacia adelante manteniendo las piernas casi rectas y la espalda neutra. Fortalece isquiotibiales y la zona lumbar mediante el patrón de bisagra de cadera.'),
  ('Piernas', 'Puente con propio peso', 'Acostado boca arriba con las rodillas flexionadas y los pies apoyados, elevás la cadera apretando los glúteos en la parte alta del movimiento. Es el ejercicio básico de activación de glúteos, sin necesidad de equipamiento.'),
  ('Piernas', 'Puentes a una pierna', 'El mismo puente de cadera pero apoyando un solo pie en el piso mientras la otra pierna queda extendida en el aire. Suma dificultad y trabaja cada glúteo por separado.'),
  ('Piernas', 'Puente con bandas', 'Se hace el puente de cadera con una banda elástica rodeando las rodillas, empujándolas hacia afuera durante el movimiento. Suma activación extra del glúteo medio al ejercicio básico.'),
  ('Piernas', 'Caminata de pato', 'Se camina hacia adelante manteniendo una posición de sentadilla profunda todo el tiempo, sin pararse entre paso y paso. Es un ejercicio de resistencia muy exigente para cuádriceps y glúteos.'),
  ('Piernas', 'Ejercicio Superman en cuadrupedia', 'Apoyado en manos y rodillas (cuatro apoyos), extendés al mismo tiempo un brazo y la pierna contraria, manteniendo el equilibrio. Trabaja la estabilidad del core y la zona lumbar sin cargar peso.'),
  ('Piernas', 'Los Groiners', 'Desde la posición de plancha, llevás un pie hacia adelante apoyándolo junto a la mano del mismo lado, y alternás rápidamente entre ambos lados. Es un ejercicio dinámico que mejora la movilidad de cadera además de exigir el core.'),
  ('Piernas', 'Hidrantes', 'En cuatro apoyos (manos y rodillas), elevás una pierna hacia el costado manteniendo la rodilla flexionada, como si fuera un perro marcando territorio. Aísla directamente el glúteo medio.'),
  ('Piernas', 'Elevaciones de cadera con maquina Smith', 'El movimiento de hip thrust (elevación de cadera) pero con la barra guiada por un riel fijo. Esa guía da más estabilidad para poder cargar peso con seguridad.'),
  ('Piernas', 'Elevaciones de cadera con barra', 'Con la espalda apoyada contra un banco y una barra acolchada sobre la cadera, elevás la pelvis hasta que el torso quede en línea con los muslos. Es uno de los ejercicios más efectivos para el desarrollo de glúteos.'),
  ('Piernas', 'Abducciones de cadera sentado con banda', 'Sentado con una banda elástica alrededor de las rodillas, abrís y cerrás las piernas contra esa resistencia. Aísla el glúteo medio con un movimiento simple y controlado.'),
  ('Piernas', 'Abducción de cadera con máquina de abducción de cadera', 'Sentado en la máquina específica, con las piernas apoyadas en los soportes, abrís las rodillas contra la resistencia de la máquina. Es una variante guiada del trabajo de glúteo medio.'),
  ('Piernas', 'Abducción con polea', 'De pie junto a una polea baja con un cable sujeto al tobillo, alejás la pierna del cuerpo hacia el costado. Aísla el glúteo medio de una pierna a la vez con tensión constante.'),
  ('Piernas', 'Elevaciones en posición de rana con propio peso', 'Acostado boca arriba, unís las plantas de los pies dejando las rodillas caer hacia los costados, y elevás la cadera desde esa posición. La rotación externa de cadera hace que el glúteo trabaje distinto que en el puente tradicional.'),
  ('Piernas', 'Elevaciones cortas en posición de rana con maquina Smith', 'El mismo movimiento de rana pero sumando la barra guiada como resistencia adicional sobre la cadera.'),
  ('Piernas', 'Almejas laterales con banda', 'Acostado de costado con las rodillas flexionadas y una banda elástica sobre ellas, abrís la rodilla de arriba manteniendo los talones juntos. Aísla fuertemente el glúteo medio, clave para la estabilidad de cadera.'),
  ('Piernas', 'Levantamiento de pierna acostado de lado', 'Acostado de costado con las piernas extendidas, elevás la pierna de arriba manteniéndola recta y controlada. Trabaja el glúteo medio y la parte externa del muslo.'),
  ('Piernas', 'Elevaciones de bíceps femoral con máquina GHD', 'Sostenido de los tobillos en la máquina, con el torso hacia abajo, flexionás el cuerpo hacia arriba usando la fuerza de la parte trasera de la pierna. Genera un trabajo muy intenso de isquiotibiales y glúteos.'),
  ('Piernas', 'Step Up con mancuernas', 'Con una mancuerna en cada mano, subís a un cajón o banco con una sola pierna hasta quedar parado arriba, y bajás con control. Es un ejercicio unilateral que exige fuerza de cuádriceps y glúteos además de equilibrio.'),
  ('Piernas', 'Caminata lateral con minibanda', 'Con una banda elástica alrededor de los tobillos o por encima de las rodillas, das pasos hacia los costados manteniendo tensión en la banda todo el tiempo. Activa fuerte el glúteo medio y ayuda a estabilizar la cadera.'),
  ('Piernas', 'Elevaciones de rodilla', 'De pie o suspendido de una barra, elevás las rodillas hacia el pecho de forma controlada. Trabaja los flexores de cadera y suma trabajo a la parte baja del abdomen.'),
  ('Cuerpo completo', 'Columpios con kettlebell', 'Con las piernas separadas al ancho de hombros, balanceás la kettlebell entre las piernas hacia atrás y luego hacia adelante usando el impulso de la cadera, no de los brazos. Es un ejercicio explosivo que trabaja glúteos, isquiotibiales y core.'),
  ('Piernas', 'Contragolpe con cable', 'De pie frente a una polea baja con el cable sujeto al tobillo, extendés la pierna hacia atrás manteniendo la rodilla casi recta. Aísla el glúteo mayor con tensión constante desde la polea.'),
  ('Piernas', 'Patadas de burro', 'En cuatro apoyos, con la rodilla flexionada a 90°, elevás esa pierna hacia atrás y arriba sin rotar la cadera. Aísla el glúteo mayor con un movimiento simple y controlado.'),
  ('Piernas', 'Elevaciones de cadera acostado lateralmente', 'Acostado de costado, apoyado sobre el antebrazo, elevás la cadera despegándola del piso hasta alinear el cuerpo. Trabaja glúteo medio y oblicuos al mismo tiempo.'),
  ('Piernas', 'Sentadilla Posturas funcionales', 'Se combina el movimiento de sentadilla con un gesto adicional, como un alcance con los brazos o una rotación de torso al bajar. Es una variante más funcional que suma trabajo de movilidad y coordinación al patrón básico de sentadilla.'),
  ('Pantorrillas', 'Elevación de gemelos sentado', 'Sentado en la máquina, con el peso apoyado sobre las rodillas, elevás los talones despegándolos del piso lo más posible y bajás con control. Al hacerse con la rodilla flexionada, enfatiza el sóleo (la parte más profunda del gemelo).'),
  ('Pantorrillas', 'Elevación de gemelos de pie', 'De pie, con peso cargado sobre los hombros (barra, máquina o mancuernas), elevás los talones lo más alto posible y bajás controlando el estiramiento. Al hacerse con la pierna extendida, enfatiza el gastrocnemio, el músculo que da forma visible a la pantorrilla.');

-- Grupos musculares. Reutiliza los del seed y agrega los que faltan.
-- Nuevos: Piernas, Cuerpo completo
insert into public.muscle_groups (name, region) values
  ('Pecho', 'superior'),
  ('Espalda', 'superior'),
  ('Hombros', 'superior'),
  ('Bíceps', 'superior'),
  ('Tríceps', 'superior'),
  ('Abdominales', 'core'),
  ('Piernas', 'inferior'),
  ('Cuerpo completo', 'full'),
  ('Pantorrillas', 'inferior')
on conflict (name) do nothing;

-- Guarda contra Muscle Groups con otro nombre en la base: el join de abajo
-- los descartaria en silencio. Aca se aborta explicitamente.
do $$
declare
  faltan text[];
begin
  select array_agg(distinct c.grupo)
    into faltan
  from _catalogo c
  left join public.muscle_groups mg on mg.name = c.grupo
  where mg.id is null;
  if faltan is not null then
    raise exception
      'muscle_groups no encontrado(s): %. Revisar el nombre contra select name from public.muscle_groups;',
      faltan;
  end if;
end $$;

-- Carga. imagen_url / video_url / created_by quedan en NULL a proposito.
insert into public.exercises
  (muscle_group_id, name, instructions, image_url, video_url, created_by)
select mg.id, c.nombre, c.instrucciones, null, null, null
from _catalogo c
join public.muscle_groups mg on mg.name = c.grupo
where not exists (
  select 1 from public.exercises e
  where lower(btrim(e.name)) = lower(btrim(c.nombre))
);

-- Verificacion: los 143 nombres del catalogo tienen que
-- estar en la tabla (los que ya existian, cuentan igual). Si falta alguno,
-- se aborta y no queda nada a medias.
do $$
declare
  faltan int;
begin
  select count(*) into faltan
  from _catalogo c
  where not exists (
    select 1 from public.exercises e
    where lower(btrim(e.name)) = lower(btrim(c.nombre))
  );
  if faltan > 0 then
    raise exception 'faltan % ejercicio(s) del catalogo por cargar', faltan;
  end if;
end $$;

commit;

-- Resumen final (correr despues del commit).
select mg.region, mg.name as grupo, count(*) as ejercicios
from public.exercises e
join public.muscle_groups mg on mg.id = e.muscle_group_id
group by 1, 2
order by 1, 2;
