/**
 * Formularios de Ajustes compartidos entre el alumno y el profe.
 *
 * Las pantallas de `(client)/perfil/ajustes/*` y `(admin)/cuenta/ajustes/*` son
 * envoltorios finos sobre estos componentes: así el profe reutiliza exactamente
 * el mismo formulario de contraseña, email, nombre, usuario e idioma, sin
 * copiar-pegar ni mantener dos versiones que se desincronizan.
 */
export { EmailSettings } from './email-settings';
export { LanguageSettings } from './language-settings';
export { NameSettings } from './name-settings';
export { PasswordSettings } from './password-settings';
export { UsernameSettings } from './username-settings';
