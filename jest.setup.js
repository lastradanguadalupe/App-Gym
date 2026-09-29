// El cliente de Supabase lee EXPO_PUBLIC_* al importarse y tira si faltan.
// Los tests de lib/ no lo necesitan, pero cualquier import transitivo lo
// dispara, asi que se define antes de que corra el modulo.
process.env.EXPO_PUBLIC_SUPABASE_URL ||= 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
