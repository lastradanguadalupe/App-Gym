import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { sessionStorage } from '@/lib/storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en el archivo .env'
  );
}

// Durante el static rendering (export de web en Node) no hay `window` ni módulo nativo:
// usamos el storage de memoria de supabase-js para no crashear en el paso SSR.
const isSsr =
  typeof process !== 'undefined' && !!process.versions && !!process.versions.node;

// La sesion va a SecureStore en nativo (Keychain/Keystore), no a AsyncStorage:
// ver src/lib/storage.ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isSsr ? undefined : sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});