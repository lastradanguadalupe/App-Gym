import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Screen, Section } from '@/components/ui/screen';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { accountInfo } from '@/lib/auth-account';
import { t } from '@/i18n';

/**
 * Ajustes del profe.
 *
 * Comparte el cuerpo de formularios con el alumno (`components/settings`); acá
 * solo cambia el índice: no hay fila de "Sexo" porque el sexo del profe se edita
 * en su Perfil, junto al resto de sus datos personales.
 */
export default function CuentaAjustesScreen() {
  const { locale } = useI18n();
  const { session, signOut } = useSession();

  const user = session?.user ?? null;
  const info = user ? accountInfo(user) : null;

  return (
    <Screen>
      <Section title={t('ajustes.cuenta')}>
        <ListGroup>
          <ListRow
            icon="email-outline"
            label={t('ajustes.email')}
            value={info?.email ?? '—'}
            onPress={() => router.push('/cuenta/ajustes/email')}
          />
          <ListRow
            icon="lock-outline"
            label={t('ajustes.contrasena')}
            // El valor anticipa el estado: "sin definir" en una cuenta de Google
            // es una acción pendiente, no un dato faltante.
            value={info?.hasPassword ? undefined : t('ajustes.sinDefinir')}
            onPress={() => router.push('/cuenta/ajustes/password')}
          />
        </ListGroup>

        {info && !info.hasPassword ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t('ajustes.googleSinContrasena')}
          </ThemedText>
        ) : null}
      </Section>

      <Section title={t('ajustes.perfilSeccion')}>
        <ListGroup>
          <ListRow
            icon="account-outline"
            label={t('ajustes.nombreCompleto')}
            onPress={() => router.push('/cuenta/ajustes/nombre')}
          />
          <ListRow
            icon="account-details-outline"
            label={t('ajustes.nombreUsuario')}
            onPress={() => router.push('/cuenta/ajustes/usuario')}
          />
          <ListRow
            icon="translate"
            label={t('ajustes.idioma')}
            value={locale === 'es' ? 'Español' : 'English'}
            onPress={() => router.push('/cuenta/ajustes/idioma')}
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
