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
 */
const es = {
  common: {
    guardar: 'Guardar',
    guardarCambios: 'Guardar cambios',
    cancelar: 'Cancelar',
    continuar: 'Continuar',
    atras: 'Atrás',
    siguiente: 'Siguiente',
    finalizar: 'Finalizar',
    opcional: 'Opcional',
    cerrarSesion: 'Cerrar sesión',
    cargando: 'Cargando…',
    errorGenerico: 'Algo salió mal. Intentá de nuevo.',
    reintentar: 'Reintentar',
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
    datosCuenta: 'Datos de la cuenta',
    nombre: 'Nombre',
    tuProfe: 'Tu profe',
    informacionRutina: 'Tu información para la rutina',
    edadAnios: 'Edad: %{edad} años',
    fechaNacimiento: 'Fecha de nacimiento',
    objetivo: 'Objetivo',
    enfermedades: 'Enfermedades (separadas por coma)',
    lesiones: 'Lesiones (separadas por coma)',
    experiencia: 'Nivel de experiencia',
    expPrincipiante: 'Principiante',
    expIntermedio: 'Intermedio',
    expAvanzado: 'Avanzado',
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
  },

  medidas: {
    titulo: 'Tu evolución',
    actual: 'Actual',
    sinMedidas: 'Todavía no tenés mediciones',
    sinMedidasSubtitulo: 'Agregá tu primera medición para empezar a ver tu evolución.',
    primeraMedicion: 'Agregá tu primera medición',
    nuevaMedicion: 'Nueva medición',
    medicionRegistrada: 'Medición registrada.',
    pesoActual: 'Peso actual',
    alturaActual: 'Altura actual',
    variacion: 'Variación',
    sinCambio: 'sin cambio',
    desdeUltima: 'desde la primera',
    subio: 'subió',
    bajo: 'bajó',
    kgPorDia: '%{signo}%{valor} kg',
    ultimaMedida: 'Última: %{fecha}',
  },
} as const;

/**
 * Una sección del diccionario es un mapa de strings, salvo el vocabulario de
 * fechas, que son listas de strings. El condicional va sobre la sección entera:
 * aplicado propiedad por propiedad, `keyof` de una tuplareadonly también
 *includes `length`/`toString` y el mapeo los trataría como textos.
 */
type Seccion<T> = T extends readonly string[]
  ? readonly string[]
  : { -readonly [K in keyof T]: string };

/** Forma del diccionario: la define `es`, `en` tiene que cumplirla. */
export type Traducciones = {
  -readonly [K in keyof typeof es]: Seccion<(typeof es)[K]>;
};

export default es satisfies Traducciones;

/** Claves de traducción disponibles, para tipar el helper `t`. */
export type TranslationKey =
  | `common.${keyof typeof es.common}`
  | `perfil.${keyof typeof es.perfil}`
  | `ajustes.${keyof typeof es.ajustes}`
  | `medidas.${keyof typeof es.medidas}`;

export const DEFAULT_LOCALE: Idioma = 'es';