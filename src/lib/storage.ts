import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage adapter para la sesion de Supabase.
 *
 * La sesion contiene el access token y el refresh token, asi que en nativo va
 * a SecureStore (Keychain en iOS, Keystore en Android) en vez de AsyncStorage.
 * En Android eso además sobrevive a un backup de Google porque el Keystore
 * borra la clave al desinstalar la app.
 *
 * En web no hay Keychain ni Keystore: `localStorage` es la unica opcion, y
 * queda expuesto a XSS. Es una limitacion conocida de la web, no algo que
 * este adapter pueda arreglar.
 */
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// SecureStore documenta un limite blando de ~2048 bytes en algunas versiones
// de iOS. La sesion completa (access + refresh token) puede pasarse. Si falla,
// caemos a AsyncStorage en vez de romper el login.
const resilientStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await secureStorage.getItem(key);
    } catch (e) {
      console.warn('[storage] SecureStore getItem fallo, usando AsyncStorage', e);
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await secureStorage.setItem(key, value);
    } catch (e) {
      console.warn('[storage] SecureStore setItem fallo, usando AsyncStorage', e);
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await secureStorage.removeItem(key);
    } catch (e) {
      console.warn('[storage] SecureStore removeItem fallo, usando AsyncStorage', e);
      await AsyncStorage.removeItem(key);
    }
  },
};

export const sessionStorage = Platform.OS === 'web' ? AsyncStorage : resilientStorage;
