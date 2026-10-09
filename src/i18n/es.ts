import type { Idioma } from '@/types';

/**
 * Diccionario de traducciones.
 *
 * `es` es la fuente de verdad: define la forma del objeto y los textos de
 * respaldo. `en` se tipa contra `es`, así que si agregás una clave y olvidás
 * traducirla, el typecheck falla en vez de dejar un texto en español colgado
 * en la versión inglesa.
 *
 * Convención de claves: `ambito.seccion.clave` en camelCase. Los placeholders
 * usan `%{nombre}` (sintaxis de i18n-js, no de Intl).
 *
 * Regla para sumar texto: TODO lo que ve el usuario entra acá, también en las
 * pantallas de profe. Una cadena en español suelta en un `.tsx` no cambia con
 * el idioma activo, que es exactamente el bug que-reportó el usuario al elegir
 * English y seguir viendo la app en español.
 */
const es = {
  /** Etiquetas de las pestañas de abajo. */
  nav: {
    inicio: 'Inicio',
    rutina: 'Rutina',
    historial: 'Historial',
    perfil: 'Perfil',
    ejercicio: 'Ejercicio',
  },

  common: {
    guardar: 'Guardar',
    guardarCambios: 'Guardar cambios',
    cancelar: 'Cancelar',
    continuar: 'Continuar',
    atras: 'Atrás',
    anterior: 'Anterior',
    siguiente: 'Siguiente',
    finalizar: 'Finalizar',
    opcional: 'Opcional',
    cerrar: 'Cerrar',
    cerrarSesion: 'Cerrar sesión',
    agregar: 'Agregar',
    quitar: 'Quitar',
    editar: 'Editar',
    borrar: 'Borrar',
    eliminar: 'Eliminar',
    reintentar: 'Reintentar',
    cargando: 'Cargando…',
    errorGenerico: 'Algo salió mal. Intentá de nuevo.',
    error: 'Error',
    sinDato: '—',
    titulo: 'Título',
    detalle: 'Detalle',
    descripcion: 'Descripción',
    descripcionOpcional: 'Descripción (opcional)',
    descripcionPlaceholder: 'Un par de líneas de contexto…',
    nombre: 'Nombre',
    instrucciones: 'Instrucciones',
    instruccionesCompleto: 'Instrucciones (cómo se hace)',
    instruccionesPlaceholder: 'Describí la ejecución paso a paso…',
    imagenUrl: 'URL de la imagen',
    imagenUrlOpcional: 'URL de la imagen (opcional)',
    nombreBloque: 'Nombre del bloque',
    nombreBloquePlaceholder: 'Ej: Tren superior',
    tituloPlaceholder: 'Ej: Rutina de hipertrofia',
    diaSemana: 'Día de la semana',
    libreDescanso: 'Libre / Descanso',
    quitarBloque: 'Quitar bloque',
    eliminarBloque: 'Eliminar bloque',
    eliminarRutina: 'Eliminar rutina',
    confirmarEliminarBloque: '¿Seguro que querés eliminar este bloque?',
    confirmarEliminarRutina: '¿Seguro que querés eliminar toda la rutina del alumno?',
    confirmarQuitarEjercicio: '¿Quitar este ejercicio?',
    bloqueNum: 'Bloque %{num}',
    bloqueRegion: 'Bloque %{num} · %{region}',
    series: 'Series',
    reps: 'Reps',
    segundos: 'Descanso (s)',
    repeticiones: 'Repeticiones',
    descanso: 'Descanso',
    peso: 'Peso',
    sinDefinir: 'Sin definir',
    alFallo: 'Al fallo',
    pesoCorporal: 'Peso corporal',
    abrirMenu: 'Abrir menú',
    cerrarMenu: 'Cerrar menú',
    sumar: 'Sumar',
    restar: 'Restar',
    ocultarContrasena: 'Ocultar contraseña',
    mostrarContrasena: 'Mostrar contraseña',
    continuarConGoogle: 'Continuar con Google',
    oConTuEmail: 'o con tu email',
    errorCargarPerfil: 'No pudimos cargar tu perfil',
    reintentarPerfil:
      'Tu cuenta existe pero no tiene un perfil asociado. Si sos alumno, pedile a tu profe que te cree uno. Si sos entrenador, revisá que tu email esté habilitado desde el panel.',
    sesionCompletando: 'Completando sesión…',
    placeholderEmail: 'tucorreo@mail.com',
    placeholderIso: 'AAAA-MM-DD',
    placeholderIsoEj: 'AAAA-MM-DD (ej: 1995-04-12)',
    placeholderUrl: 'https://…/foto.png',
    placeholderNum: '10-12',
    placeholderAltura: '175',
    placeholderPeso: '70',
    placeholderEmailProfe: 'tu@mail.com',
    placeholderNombre: 'Ej: María González',

    /** Errores de auth de Supabase, resueltos por `lib/errors.ts` según `code`. */
    credencialesIncorrectas: 'Email o contraseña incorrectos.',
    emailNoConfirmado: 'Confirmá tu email antes de entrar.',
    emailYaRegistrado: 'Ya existe una cuenta con ese email.',
    contrasenaDebil: 'La contraseña es muy débil.',
    demasiadosIntentos: 'Demasiados intentos. Esperá unos segundos y probá de nuevo.',

    /**
     * Errores que escribimos nosotros en Postgres con `raise exception`. Los RPCs
     * no conocen el idioma del usuario, así que `lib/errors.ts` los traduce
     * buscando el texto exacto en su tabla.
     */
    soloProfeBuscaAlumnos: 'Solo un profe puede buscar alumnos.',
    soloProfeAsignaAlumnos: 'Solo un profe puede asignarse alumnos.',
    soloProfeListaStaff: 'Solo un profe puede ver la lista de staff.',
    soloProfeHabilitaStaff: 'Solo un profe puede habilitar accesos de staff.',
    soloProfeQuitaStaff: 'Solo un profe puede quitar accesos de staff.',
    soloProfeVeEstadisticas: 'Solo un profe puede ver estadísticas de alumnos.',
    soloProfeCreaRutinas: 'Solo un profe puede crear rutinas.',
    soloProfeCreaBloques: 'Solo un profe puede crear bloques.',
    soloProfeAgregaEjercicios: 'Solo un profe puede agregar ejercicios.',
    grupoMuscularConEjercicios:
      'Este grupo muscular tiene ejercicios asociados. Borralos o reasignalos primero.',
    ejercicioEnUso: 'Este ejercicio está en uso por al menos una rutina. Quitalo de las rutinas primero.',
  },

  /** Regiones del cuerpo y su abreviatura, en las pantallas del alumno y del profe. */
  region: {
    superior: 'Tren superior',
    inferior: 'Tren inferior',
    core: 'Core',
    full: 'Cuerpo completo',
  },
  regionShort: {
    superior: 'Sup',
    inferior: 'Inf',
    core: 'Core',
    full: 'Full',
  },

  /**
   * Vocabulario de fechas escrito a mano en vez de usar `Intl`: el resultado
   * en Hermes/web puede variar por plataforma y no queremos que el calendario
   * o los ejes del gráfico cambien de forma según el device.
   * `months` arranca en enero; `weekdays` arranca en domingo.
   */
  months: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
  monthsShort: [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ],
  weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  weekdaysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],

  perfil: {
    title: 'Perfil',
    tuPerfil: 'Tu perfil',
    alumno: 'Alumno',
    profe: 'Profe',
    tuProfe: 'Tu profe',
    informacionRutina: 'Tu información para la rutina',

    // Hub de perfil: barra de avance y accesos rápidos.
    misDatos: 'Mis datos',
    misDatosDetalle: 'Cuestionario de la rutina',
    calendario: 'Calendario',
    calendarioDetalle: 'Días que entrenaste',
    historial: 'Historial',
    historialDetalle: 'Tus entrenamientos',
    avance: 'Tu avance',
    paraArmarRutina: 'Completá estos datos para que tu profe pueda armar tu rutina.',

    edadAnios: 'Edad: %{edad} años',
    fechaNacimiento: 'Fecha de nacimiento',
    objetivo: 'Objetivo',
    enfermedades: 'Enfermedades (separadas por coma)',
    lesiones: 'Lesiones (separadas por coma)',
    experiencia: 'Nivel de experiencia',
    medidas: 'Medidas',
    agregarMedicion: 'Agregar nueva medición',
    peso: 'Peso',
    altura: 'Altura',
    kg: 'kg',
    cm: 'cm',
    cambiosGuardados: 'Cambios guardados.',
    noSePudieronGuardar: 'No se pudieron guardar los cambios.',
    cerrarSesion: 'Cerrar sesión',
  },

  ajustes: {
    title: 'Ajustes',
    cuenta: 'Cuenta',
    perfilSeccion: 'Perfil',
    email: 'Email',
    contrasena: 'Contraseña',
    nombreCompleto: 'Nombre',
    nuevoNombre: 'Tu nombre',
    cambiarEmail: 'Cambiar email',
    cambiarPassword: 'Cambiar contraseña',
    nombreUsuario: 'Nombre de usuario',
    nuevoUsuario: 'Nuevo nombre de usuario',
    usuarioGuardado: 'Nombre de usuario actualizado.',
    usuarioSinDefinir: 'Todavía no elegiste un nombre de usuario.',
    sexo: 'Sexo',
    sexoFemenino: 'Femenino',
    sexoMasculino: 'Masculino',
    sexoNoDefinido: 'Prefiero no decirlo',
    idioma: 'Idioma',
    guardar: 'Guardar',
    correoActual: 'Tu email actual es %{email}.',
    nuevoEmail: 'Nuevo email',
    emailEnviado:
      'Te enviamos un correo a %{email}. Confirmá el enlace ahí para que el cambio entre en vigencia.',
    emailEnUso: 'Ya usás ese email.',
    emailInvalido: 'Revisá el formato del email.',
    contrasenaActual: 'Contraseña actual',
    contrasenaActualOpcional:
      'Sólo se verifica si tu proyecto exige la contraseña actual para cambiarla.',
    nuevaContrasena: 'Nueva contraseña',
    repetirContrasena: 'Repetir contraseña',
    contrasenaMuyCorta: 'La contraseña necesita al menos %{min} caracteres.',
    contrasenaDebil: 'La contraseña tiene que combinar letras y números.',
    contrasenasNoCoinciden: 'Las contraseñas no coinciden.',
    contrasenaActualIncorrecta: 'La contraseña actual no es correcta.',
    contrasenaActualIncorrectaInfo:
      'Supabase no expone cuál de los dos campos falló, por seguridad. Revisá la contraseña actual y la nueva.',
    contrasenaActualizada: 'Contraseña actualizada.',
    contrasenaIgual: 'La nueva contraseña es igual a la actual.',
    reautenticacionNecesaria: 'Necesitás volver a confirmar tu contraseña para hacer este cambio.',
    muchosIntentos: 'Demasiados intentos. Esperá un momento y probá de nuevo.',
    sesionVencida: 'Tu sesión venció. Volvé a iniciar sesión.',
    errorDesconocido: 'No pudimos completar el cambio. Probá de nuevo.',
    googleSinContrasena: 'Iniciás sesión con Google, así que todavía no tenés contraseña.',
    googleSinContrasenaInfo:
      'Podés crear una acá: Supabase le agrega la identidad de email a tu cuenta y desde ese momento entrás con email y contraseña.',
    sesion: 'Sesión',
    cerrarSesionInfo: 'Vas a salir de tu cuenta en este dispositivo.',
    usuarioEnUso: 'Ese nombre de usuario ya está tomado.',
    usuarioInvalido: 'Solo letras, números, punto y guion bajo. Entre 3 y 30 caracteres.',
    nombreActualizado: 'Nombre actualizado.',
    nombreVacio: 'El nombre no puede estar vacío.',
    sinDefinir: 'Sin definir',
  },

  medidas: {
    titulo: 'Tu evolución',
    actual: 'Actual',
    sinMedidas: 'Todavía no tenés mediciones',
    sinMedidasSubtitulo: 'Agregá tu primera medición para empezar a ver tu evolución.',
    nuevaMedicion: 'Nueva medición',
    medicionRegistrada: 'Medición registrada.',
    pesoActual: 'Peso actual',
    alturaActual: 'Altura actual',
    variacion: 'Variación',
    sinCambio: 'sin cambio',
    historial: 'Todas tus mediciones',
    fecha: 'Fecha',
    eliminar: 'Eliminar',
    pesoInvalido: 'El peso tiene que ser un número mayor a 0.',
    alturaInvalida: 'La altura tiene que ser un número mayor a 0.',
    fechaInvalida: 'La fecha tiene que tener formato AAAA-MM-DD.',
  },

  calendario: {
    titulo: 'Calendario',
    resumen: 'Este mes entrenaste %{count} %{veces}.',
    resumenVez: 'vez',
    resumenVeces: 'veces',
    sinEntrenos: 'Todavía no entrenaste este mes.',
    diaEntrenado: 'Entrenaste',
    diaSinEntrenar: 'Sin entrenar',
    mesAnterior: 'Mes anterior',
    mesSiguiente: 'Mes siguiente',
  },

  /** Unidades y conteos que se arman con interpolación, no con `Intl`. */
  format: {
    minutos: '%{min} min',
    horasMinutos: '%{h} h %{min} min',
    horas: '%{h} h',
    ejerciciosSeries: '%{ejercicios} ejercicios · %{series} series',
    soloEjercicios: '%{ejercicios} ejercicios',
    soloSeries: '%{series} series',
  },

  /** Home del alumno. */
  inicio: {
    hola: 'Hola',
    holaNombre: 'Hola, %{nombre}',
    subtitulo: 'Entrená con constancia: eso es lo que construye resultados.',
    entrenamientoHoy: 'Tu entrenamiento de hoy',
    enCurso: 'En curso',
    entrenamiento: 'Entrenamiento',
    pausar: 'Pausar',
    reanudar: 'Reanudar',
    sinRutina: 'Todavía no tenés rutina',
    sinRutinaSubtitulo:
      'Tu profe todavía no te asignó una rutina. Cuando lo haga, vas a verla acá.',
    descanso: 'Hoy es día de descanso',
    descansoSubtitulo:
      'Entrá a tu rutina para elegir qué días hacés cada parte del cuerpo.',
    listo: '¡Listo! Hoy ya marcaste este entrenamiento como completado.',
    completado: 'Completado',
    empezar: 'Empezar',
    tuProgreso: 'Tu progreso',
    entrenamientos: 'Entrenamientos',
    tiempoTotal: 'Tiempo total',
    estaSemana: 'Esta semana',
    verMiRutina: 'Ver mi rutina',
    tipAlimentacion: 'Tip de alimentación',
    verHistorial: 'Ver historial',
    queresVerProgreso: '¿Querés ver todo tu progreso?',
  },

  /** Login, registro de alumno y alta de entrenador. */
  auth: {
    bienvenido: 'Bienvenido de nuevo',
    bienvenidoSubtitulo: 'Ingresá para ver tu rutina y registrar tus entrenamientos.',
    faltanCampos: 'Completá email y contraseña.',
    credencialesInvalidas: 'Credenciales inválidas. Revisá tu email y contraseña.',
    googleError: 'No se pudo iniciar sesión con Google. Probá de nuevo.',
    ingresar: 'Ingresar',
    sinCuenta: '¿Todavía no tenés cuenta? Registrate',
    accesoStaff: '¿Sos entrenador? Acceso de staff',
    faltanCamposRegistro: 'Completá nombre y email.',
    crearCuentaError: 'No se pudo crear la cuenta.',
    revisaTuEmail: 'Revisá tu email',
    emailConfirmacion: 'Te enviamos un mail de confirmación. Activá la cuenta y después ingresá.',
    emailConfirmacionCorta: 'Te enviamos un mail de confirmación. Revisá tu casilla (y spam).',
    creaTuCuenta: 'Creá tu cuenta',
    creaTuCuentaSubtitulo: 'Empezá a entrenar: tu profe va a armarte una rutina a medida.',
    placeholderComoTeLlamas: 'Cómo te llamás',
    crearCuenta: 'Crear cuenta',
    yaTenesCuenta: '¿Ya tenés cuenta? Ingresá',
    entradaProfe: '¿Sos entrenador? Entrá por acá',
    profeNoHabilitado:
      'Ese email no está habilitado como entrenador. Pedile a un profe que te agregue desde su panel.',
    accesoEntrenadores: 'Acceso de entrenadores',
    panelProfeSubtitulo: 'Gestioná alumnos, rutinas y contenido del gimnasio.',
    profeAllowList:
      'Tu cuenta se activa solo si un profe ya habilitó tu email. Si sos el primero del gimnasio, corré el script de bootstrap en el panel de Supabase.',
    crearCuentaEntrenador: 'Crear cuenta de entrenador',
    yaTengoCuenta: 'Ya tengo cuenta, quiero ingresar',
    soyAlumno: 'Soy alumno, quiero registrarme',
  },

  /** Pantallas del profe: panel, ficha del alumno, catálogo y contenido. */
  admin: {
    noSePudoGuardar: 'No se pudo guardar',
    errorAsignacionDia: 'Revisá la asignación del día e intentá de nuevo.',
    rutinaSinNombre: 'Poné un nombre para la rutina.',
    rutinaSinBloques: 'Agregá al menos un bloque con su nombre y algunos ejercicios.',
    alumnoNoAsignado:
      'Este alumno no está asignado a tu cuenta. Entrá al panel, buscalo y tocá "Agregar".',
    rutinaCreadaUna: 'Rutina creada con %{count} bloque.',
    rutinaCreadaVarias: 'Rutina creada con %{count} bloques.',
    errorCrearRutina: 'No se pudo crear la rutina.',
    revisaValores: 'Revisá los valores',
    seriesDescansoInvalidos: 'Series y descanso deben ser números válidos.',
    alumnoNoEncontrado: 'Alumno no encontrado',
    alumnoNoEncontradoSubtitulo: 'Volvé al listado y elegí un alumno.',
    fichaAlumno: 'Ficha del alumno',
    edad: 'Edad',
    edadAnios: '%{edad} años',
    nivel: 'Nivel',
    avance: 'Avance',
    nuevaRutina: 'Nueva rutina',
    nuevaRutinaSubtitulo:
      'Armá la primera versión con bloques y ejercicios del catálogo. Después podés seguir editándola cuando quieras.',
    bloques: 'Bloques (%{count})',
    zonaCuerpo: 'Zona del cuerpo',
    ejercicios: 'Ejercicios (%{count})',
    agregarBloque: 'Agregar bloque',
    crearRutina: 'Crear rutina',
    planSemanal: 'Plan semanal',
    bloquesProgramados: 'Bloques (cada uno se programa en un día de la semana)',
    sinDiaAsignado: 'Sin día asignado: el alumno lo ve como libre.',
    tocaMismoDia: 'Tocá el mismo día para dejarlo libre.',
    ejercicioResumen: '%{series} × %{reps} · %{descanso}s · %{musculo}',
    ejercicio: 'Ejercicio',
    elegiMusculo: 'Elegí un músculo y agregá ejercicios',
    catalogoVacio:
      'Todavía no hay ejercicios en el catálogo. Cargalos desde “Catálogo de ejercicios”.',
    agregarEjercicio: 'Agregar ejercicio',

    buscarSinNombre: 'Ingresá el nombre (o email) del alumno.',
    buscarSinResultados:
      'No encontré alumnos con ese nombre o email. Deben registrarse primero desde la app.',
    buscarError: 'No se pudo buscar. Probá de nuevo.',
    buscarHint: 'Buscá por nombre y apellido (o email).',
    alumnoAsignado: '%{nombre} ahora es tu alumno.',
    asignarError: 'No se pudo asignar. Puede que ya tenga otro profe asignado.',
    panelProfe: 'Panel del profe',
    /** Títulos de los headers del stack de admin. */
    misAlumnos: 'Mis alumnos',
    alumno: 'Alumno',
    ejerciciosTitulo: 'Ejercicios',
    panelSubtitulo: 'Gestioná tus alumnos, sus rutinas y el contenido motivacional.',
    agregarAlumno: 'Agregar un alumno',
    nombreAlumno: 'Nombre del alumno',
    resultados: 'Resultados (%{count})',
    sinNombre: 'Sin nombre',
    buscarAlumno: 'Buscar alumno',
    catalogoEjercicios: 'Catálogo de ejercicios',
    frasesYTips: 'Frases y tips',
    sinAlumnos: 'Todavía no tenés alumnos',
    sinAlumnosSubtitulo:
      'Agregá un alumno por su email para empezar a asignarle una rutina.',
    tusAlumnos: 'Tus alumnos (%{total})',
    alumnoResumen: '%{sesiones} entrenamientos · %{minutos} · %{rutina}',
    conRutina: 'con rutina',
    sinRutina: 'sin rutina',
    sinDatos: 'Sin datos',

    faltanNombreMusculo: 'Completá nombre y elegí un músculo.',
    ejercicioAgregado: 'Ejercicio agregado al catálogo.',
    ejercicioAgregarError: 'No se pudo agregar el ejercicio.',
    ejercicioGuardarError: 'No se pudo guardar el ejercicio.',
    catalogo: 'Catálogo',
    ejerciciosCargados: '%{count} ejercicios cargados, listos para armar rutinas.',
    nuevoEjercicio: 'Nuevo ejercicio',
    placeholderEjercicio: 'Ej: Press de banca',
    grupoMuscular: 'Grupo muscular',
    guardarEjercicio: 'Guardar ejercicio',

    contenido: 'Contenido',
    contenidoSubtitulo: 'Es lo que tus alumnos van a ver en su pantalla de inicio.',
    fraseNueva: 'Frase motivadora nueva',
    placeholderFrase: 'Escribí una frase motivadora...',
    agregarFrase: 'Agregar frase',
    enUso: 'En uso (%{count})',
    borrarFrase: 'Borrar frase',
    tipNuevo: 'Tip de alimentación nuevo',
    placeholderTip: 'Ej: Hidratación constante',
    agregarTip: 'Agregar tip',
    tipsPublicados: 'Tips publicados (%{count})',
    borrarTip: 'Borrar tip',

    /** Navegación del panel (sidebar) y títulos de sección. */
    navAlumnos: 'Alumnos',
    masAlumnos: '%{count} más',

    /** Panel de parámetros por ejercicio (series / reps / descanso / peso). */
    parametrosEjercicio: 'Parámetros del ejercicio',
    configurarEjercicio: 'Configurar ejercicio',
    editarParametros: 'Editar parámetros',
    parametrosObligatorios:
      'Series y repeticiones son obligatorias. Descanso y peso quedan opcionales.',
    faltanSeriesReps: 'Elegí series y repeticiones para poder guardar.',
    rangoInvalido: 'El mínimo no puede ser mayor que el máximo.',
    repsFijo: 'Número fijo',
    repsRango: 'Rango',
    repsAlFallo: 'Al fallo',
    minimo: 'Mínimo',
    maximo: 'Máximo',
    paso: 'Paso',
    kilos: 'kg',
    segundosPaso: 'seg',
  },

  /** Cuestionario inicial del alumno, antes de que le armen la rutina. */
  onboarding: {
    primerPaso: 'Primer paso',
    titulo: 'Contanos un poco sobre vos',
    subtitulo:
      'Esta información es para que tu profe arme la rutina que mejor se adapte a tu cuerpo y tus objetivos. La podés modificar cuando quieras.',
    alturaCm: 'Altura (cm)',
    pesoKg: 'Peso (kg)',
    objetivoPlaceholder: 'Ej: ganar músculo, bajar de peso, mantenerme...',
    enfermedadesPlaceholder: 'Ej: hipertensión, diabetes... (si ninguna, dejalo vacío)',
    lesionesPlaceholder: 'Ej: rodilla, hombro... (si ninguna, dejalo vacío)',
    guardarYEmpezar: 'Guardar y empezar',
  },

  /** Rutina del alumno: bloques, semana y ejercicios. */
  rutina: {
    sinRutina: 'Aún no tenés rutina',
    sinRutinaSubtitulo:
      'Tu profe todavía no te asignó una rutina con bloques de entrenamiento.',
    tuSemana: 'Tu semana',
    helperSemana:
      'Tocá el día que hace este bloque. Tu profe arma el plan y vos podés ajustarlo; tocá de nuevo el mismo día para dejarlo libre.',
    seriesReps: '%{series} × %{reps} · %{descanso}s descanso',
    descansoSegundos: '%{s}s de descanso',
    bloqueGenerico: 'Bloque',
    completadoHoy: 'Completado hoy',
    marcarCompleto: 'Marcar completo',
    noEncontrado: 'Ejercicio no encontrado',
    fotoPendiente: 'Foto pendiente · %{region}',
    parametrosEnRutina: 'Parámetros en tu rutina',
    comoHacerlo: 'Cómo hacerlo',
    sinInstrucciones: 'Sin indicaciones por el momento. Consultá a tu profe.',
    verVideo: 'Ver video de referencia',
  },

  /** Historial de entrenamientos del alumno. */
  historial: {
    sinEntrenos: 'Todavía no entrenaste',
    sinEntrenosSubtitulo:
      'Cuando completes o finalices un entrenamiento, vas a ver tu historial acá.',
    subtitulo: 'Cada entrenamiento que completás queda registrado acá.',
    tiempo: 'Tiempo',
    completo: 'Completo',
    conTiempo: '%{conTiempo} de %{total} entrenamientos con tiempo registrado por el reloj.',
  },

  /** Etiquetas de los niveles, compartidas entre el cuestionario y la ficha. */
  experiencia: {
    inicio: 'Principiante',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
  },
} as const;

/**
 * Una sección del diccionario es un mapa de strings, salvo el vocabulario de
 * fechas, que son listas de strings. El condicional va sobre la sección entera:
 * aplicado propiedad por propiedad, `keyof` de una tupla readonly también
 * incluye `length`/`toString` y el mapeo los trataría como textos.
 */
type Seccion<T> = T extends readonly string[]
  ? readonly string[]
  : { -readonly [K in keyof T]: string };

/** Forma del diccionario: la define `es`, `en` tiene que cumplirla. */
export type Traducciones = {
  -readonly [K in keyof typeof es]: Seccion<(typeof es)[K]>;
};

export default es satisfies Traducciones;

/**
 * Claves de traducción disponibles, para tipar el helper `t`.
 *
 * Se DERIVA del diccionario en vez de listarse a mano: agregar una sección nueva
 * la vuelve usable en `t()` automáticamente, y las secciones de listas (los meses,
 * los días) quedan excluidas porque no se interpolan.
 */
type ClavesDeSeccion = {
  [K in keyof typeof es]: (typeof es)[K] extends readonly string[]
    ? never
    : keyof (typeof es)[K];
};

export type TranslationKey = {
  [K in keyof ClavesDeSeccion]: ClavesDeSeccion[K] extends never
    ? never
    : `${K & string}.${ClavesDeSeccion[K] & string}`;
}[keyof ClavesDeSeccion];

export const DEFAULT_LOCALE: Idioma = 'es';