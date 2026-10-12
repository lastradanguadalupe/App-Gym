import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Screen, Section } from '@/components/ui/screen';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { accountInfo } from '@/lib/auth-account';
import { t } from '@/i18n';
import type { Sexo } from '@/types';

/**
 * Ajustes como índice: una fila por dato, cada una en su propia pantalla.
 *
 * Antes eran seis formularios apilados en un scroll largo, con seis botones de
 * guardar y ningún título que dijera dónde estabas. Ahora la pantalla responde
 * "¿qué es mi email?" mirando la fila, y tocar la fila entra a editarla.
 */

function sexoLabel(sexo: Sexo | null): string | null {
  if (!sexo) return null;
  switch (sexo) {
    case 'femenino':
      return t('ajustes.sexoFemenino');
    case 'masculino':
      return t('ajustes.sexoMasculino');
    case 'prefiero no decirlo':
      return t('ajustes.sexoNoDefinido');
  }
}

function idiomaLabel(locale: 'es' | 'en'): string {
  return locale === 'es' ? 'Español' : 'English';
}

export default function AjustesScreen() {
  const { locale } = useI18n();
  const { session, profile, clientDetails, signOut } = useSession();

  const user = session?.user ?? null;
  const info = user ? accountInfo(user) : null;
  const sexo = clientDetails?.sexo ?? null;

  return (
    <Screen>
      <Section title={t('ajustes.cuenta')}>
        <ListGroup>
          <ListRow
            icon="email-outline"
            label={t('ajustes.email')}
            value={info?.email ?? '—'}
            onPress={() => router.push('/perfil/ajustes/email')}
          />
          <ListRow
            icon="lock-outline"
            label={t('ajustes.contrasena')}
            // El valor anticipa el estado: "sin definir" en una cuenta de Google
            // es una acción pendiente, no un dato faltante.
            value={info?.hasPassword ? undefined : t('ajustes.sinDefinir')}
            onPress={() => router.push('/perfil/ajustes/password')}
          />
        </ListGroup>

        {info && !info.hasPassword ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('ajustes.googleSinContrasena')}
            {'\n'}
            {t('ajustes.googleSinContrasenaInfo')}
          </ThemedText>
        ) : null}
      </Section>

      <Section title={t('ajustes.perfilSeccion')}>
        <ListGroup>
          <ListRow
            icon="account-outline"
            label={t('ajustes.nombreCompleto')}
            value={profile?.name ?? t('ajustes.sinDefinir')}
            onPress={() => router.push('/perfil/ajustes/nombre')}
          />
          <ListRow
            icon="account-details-outline"
            label={t('ajustes.nombreUsuario')}
            value={profile?.username ?? t('ajustes.sinDefinir')}
            onPress={() => router.push('/perfil/ajustes/usuario')}
          />
          <ListRow
            icon="gender-male-female"
            label={t('ajustes.sexo')}
            value={sexoLabel(sexo) ?? t('ajustes.sinDefinir')}
            onPress={() => router.push('/perfil/ajustes/sexo')}
          />
          <ListRow
            icon="translate"
            label={t('ajustes.idioma')}
            value={idiomaLabel(locale)}
            onPress={() => router.push('/perfil/ajustes/idioma')}
          />
        </ListGroup>
      </Section>

      <Section title={t('ajustes.privacidadSeccion')}>
        <ListGroup>
          <ListRow
            icon="shield-check-outline"
            label={t('ajustes.politicaPrivacidad')}
            onPress={() => router.push('/privacidad')}
          />
        </ListGroup>
      </Section>

      <Section title={t('ajustes.sesion')}>
        <ThemedText type="small" themeColor="textSecondary">
          {t('ajustes.cerrarSesionInfo')}
        </ThemedText>
        <Button
          variant="danger"
          label={t('common.cerrarSesion')}
          icon="logout"
          onPress={signOut}
        />
      </Section>
    </Screen>
  );
}