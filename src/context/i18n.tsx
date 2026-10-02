import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/session';
import { i18n } from '@/i18n';
import { DEFAULT_LOCALE } from '@/i18n/es';
import { updateProfileLanguage } from '@/lib/db';
import type { Idioma } from '@/types';

type I18nContextValue = {
  /** Idioma activo. Refleja `profiles.idioma` (con ajuste optimista). */
  locale: Idioma;
  /** Cambia el idioma y lo persiste. Revierte a `locale` si el guardado falla. */
  setLocale: (next: Idioma) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Idioma de la app.
 *
 * La fuente de verdad es `profiles.idioma`, no el dispositivo: el mismo usuario
 * quiere ver la app en el mismo idioma en el celu y en la web. El valor se
 * aplica de forma optimista para que el cambio de idioma se vea al instante, y
 * `profiles.idioma` vuelve a mandarlo en cuanto llega el perfil.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { session, profile } = useSession();
  const [locale, setLocaleState] = useState<Idioma>(DEFAULT_LOCALE);

  // Cuando el perfil carga (o se refresca), la base manda.
  useEffect(() => {
    if (profile?.idioma) setLocaleState(profile.idioma);
  }, [profile?.idioma]);

  // El resto de la app lee de la instancia compartida, no del contexto.
  useEffect(() => {
    i18n.locale = locale;
  }, [locale]);

  const setLocale = useCallback(
    async (next: Idioma) => {
      const previous = locale;
      setLocaleState(next);
      const uid = session?.user?.id;
      if (!uid) return;
      try {
        await updateProfileLanguage(uid, next);
      } catch (e) {
        setLocaleState(previous);
        throw e;
      }
    },
    [locale, session?.user?.id]
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale }), [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return ctx;
}