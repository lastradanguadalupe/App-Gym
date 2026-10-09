import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty';
import { Field } from '@/components/ui/field';
import { Screen, Section } from '@/components/ui/screen';
import { WeightChart } from '@/components/ui/weight-chart';
import { Spacing } from '@/constants/theme';
import { useI18n } from '@/context/i18n';
import { useSession } from '@/context/session';
import { useTheme } from '@/hooks/use-theme';
import { isIsoDate, toIsoDate } from '@/lib/calendar';
import { deleteMedida, fetchMedidas, upsertMedida } from '@/lib/db';
import { formatShortDate, t } from '@/i18n';
import type { Idioma, MedidaCorporal } from '@/types';

/**
 * Evolución de medidas.
 *
 * Altura y peso se editan en el mismo formulario porque `medidas_corporales` los
 * guarda en una sola fila: son dos campos de una medición, no dos series. El
 * peso es obligatorio (la tabla tiene CHECK `> 0`) y la altura solo se envía si
 * el usuario la escribe, para no pisar con `0` un valor que él no completó.
 *
 * El trigger `medidas_sync_client_details` de la base espeja la última
 * medición en `client_details`, así que el resumen de arriba y el formulario de
 * "Mis datos" no pueden quedar desincronizados: se refresca el perfil después de
 * cada escritura.
 */

function formatKg(value: number, locale: Idioma): string {
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} ${t('perfil.kg')}`;
}

/** Acepta coma o punto decimal; devuelve `null` si no es un número. */
function round(value: string): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** `+1.2 kg` / `-0.8 kg` / `sin cambio`. El signo lo da el dato, no el color. */
function formatDelta(delta: number | null): string {
  if (delta == null) return '—';
  if (delta === 0) return t('medidas.sinCambio');
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded} ${t('perfil.kg')}`;
}

export default function MedidasScreen() {
  const theme = useTheme();
  const { locale } = useI18n();
  const { session, clientDetails, refreshProfile } = useSession();

  const [medidas, setMedidas] = useState<MedidaCorporal[]>([]);
  const [loading, setLoading] = useState(true);
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [fecha, setFecha] = useState(() => toIsoDate(new Date()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const uid = session?.user?.id;

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      setMedidas(await fetchMedidas(uid));
    } catch (e) {
      console.warn(e);
      setError(t('common.errorGenerico'));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    void load();
  }, [load]);

  // El formulario arranca con los valores actuales: lo habitual es registrar el
  // peso de hoy, no escribir todo de cero.
  useEffect(() => {
    if (!clientDetails) return;
    setPeso(clientDetails.peso_kg != null ? String(clientDetails.peso_kg) : '');
    setAltura(clientDetails.altura_cm != null ? String(clientDetails.altura_cm) : '');
  }, [clientDetails]);

  async function handleAdd() {
    if (!uid) return;
    setError(null);
    setMessage(null);

    const pesoNum = round(peso);
    if (pesoNum == null || pesoNum <= 0) {
      setError(t('medidas.pesoInvalido'));
      return;
    }
    const alturaNum = round(altura);
    if (altura.trim() && (alturaNum == null || alturaNum <= 0)) {
      setError(t('medidas.alturaInvalida'));
      return;
    }
    if (!isIsoDate(fecha.trim())) {
      setError(t('medidas.fechaInvalida'));
      return;
    }

    setSaving(true);
    try {
      await upsertMedida(uid, {
        fecha: fecha.trim(),
        peso_kg: pesoNum,
        altura_cm: alturaNum,
      });
      await Promise.all([load(), refreshProfile()]);
      setMessage(t('medidas.medicionRegistrada'));
    } catch (e) {
      console.warn(e);
      setError(t('common.errorGenerico'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!uid) return;
    setPendingDelete(null);
    try {
      await deleteMedida(uid, id);
      await Promise.all([load(), refreshProfile()]);
    } catch (e) {
      console.warn(e);
      setError(t('common.errorGenerico'));
    }
  }

  const chartData = medidas.map((medida) => ({
    label: formatShortDate(medida.fecha, locale),
    value: medida.peso_kg,
  }));

  const last = medidas.at(-1) ?? null;
  const first = medidas[0] ?? null;

  return (
    <Screen>
      <Section title={t('medidas.titulo')}>
        <Card>
          <View style={styles.stats}>
            <Stat
              label={t('medidas.pesoActual')}
              value={last ? formatKg(last.peso_kg, locale) : '—'}
            />
            <Stat
              label={t('medidas.alturaActual')}
              value={last?.altura_cm ? `${last.altura_cm} ${t('perfil.cm')}` : '—'}
            />
            <Stat
              label={t('medidas.variacion')}
              value={formatDelta(last && first ? last.peso_kg - first.peso_kg : null)}
            />
          </View>

          {chartData.length > 0 ? (
            <WeightChart data={chartData} formatValue={(value) => formatKg(value, locale)} />
          ) : loading ? null : (
            <EmptyState
              icon="chart-line"
              title={t('medidas.sinMedidas')}
              subtitle={t('medidas.sinMedidasSubtitulo')}
            />
          )}
        </Card>
      </Section>

      <Section title={t('medidas.nuevaMedicion')}>
        <Card>
          <Field
            label={t('medidas.fecha')}
            value={fecha}
            onChangeText={setFecha}
            placeholder="AAAA-MM-DD"
            autoCapitalize="none"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label={`${t('perfil.peso')} (${t('perfil.kg')})`}
                value={peso}
                onChangeText={setPeso}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.half}>
              <Field
                label={`${t('perfil.altura')} (${t('perfil.cm')})`}
                value={altura}
                onChangeText={setAltura}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {error ? (
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          ) : null}
          {message ? (
            <ThemedText type="small" themeColor="success">
              {message}
            </ThemedText>
          ) : null}

          <Button
            label={t('medidas.nuevaMedicion')}
            icon="plus"
            onPress={handleAdd}
            loading={saving}
            disabled={!peso.trim()}
          />
        </Card>
      </Section>

      {medidas.length > 0 ? (
        <Section title={t('medidas.historial')}>
          <Card padded={false}>
            {medidas
              .slice()
              .reverse()
              .map((medida, index) => (
                <View
                  key={medida.id}
                  style={[
                    styles.item,
                    index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                  ]}>
                  <View style={styles.itemText}>
                    <ThemedText type="smallBold">{formatKg(medida.peso_kg, locale)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatShortDate(medida.fecha, locale)}
                      {medida.altura_cm ? ` · ${medida.altura_cm} ${t('perfil.cm')}` : ''}
                    </ThemedText>
                  </View>

                  {/* Confirmación en línea en vez de `Alert`: el mismo camino en
                      native y web, y la fila no se desmonta mientras se decide. */}
                  {pendingDelete === medida.id ? (
                    <View style={styles.confirm}>
                      <Button
                        label={t('common.cancelar')}
                        variant="ghost"
                        onPress={() => setPendingDelete(null)}
                      />
                      <Button
                        label={t('medidas.eliminar')}
                        variant="danger"
                        onPress={() => handleDelete(medida.id)}
                      />
                    </View>
                  ) : (
                    <Button
                      label={t('medidas.eliminar')}
                      variant="ghost"
                      icon="trash-can-outline"
                      onPress={() => setPendingDelete(medida.id)}
                    />
                  )}
                </View>
              ))}
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.statValue}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 17 },
  row: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1, minWidth: 120 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.md,
  },
  itemText: { flex: 1, gap: 2 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});