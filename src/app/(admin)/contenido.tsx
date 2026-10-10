import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { IconAction } from '@/components/ui/icon-action';
import { Screen } from '@/components/ui/screen';
import {
  createPhrase,
  createTip,
  deletePhrase,
  deleteTip,
  fetchPhrases,
  fetchTips,
} from '@/lib/db';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import type { MotivationalPhrase, NutritionTip } from '@/types';

export default function AdminContenidoScreen() {
  const theme = useTheme();
  const [phrases, setPhrases] = useState<MotivationalPhrase[]>([]);
  const [tips, setTips] = useState<NutritionTip[]>([]);
  const [loading, setLoading] = useState(true);

  const [phraseText, setPhraseText] = useState('');
  const [tipTitle, setTipTitle] = useState('');
  const [tipBody, setTipBody] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, t] = await Promise.all([fetchPhrases(), fetchTips()]);
      setPhrases(p);
      setTips(t);
    } catch (e) {
      console.warn('Error cargando contenido', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAddPhrase() {
    if (!phraseText.trim()) return;
    try {
      await createPhrase(phraseText.trim());
      setPhraseText('');
      await load();
    } catch (e) {
      console.warn(e);
    }
  }

  async function handleAddTip() {
    if (!tipTitle.trim()) return;
    try {
      await createTip({ title: tipTitle.trim(), body: tipBody.trim() });
      setTipTitle('');
      setTipBody('');
      await load();
    } catch (e) {
      console.warn(e);
    }
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={theme.brandBright} style={styles.loader} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="eyebrow" themeColor="text">
          {t('admin.contenido')}
        </ThemedText>
        <ThemedText type="display">{t('admin.frasesYTips')}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t('admin.contenidoSubtitulo')}
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('admin.fraseNueva')}
        </ThemedText>
        <Field
          value={phraseText}
          onChangeText={setPhraseText}
          placeholder={t('admin.placeholderFrase')}
          multiline
        />
        <Button label={t('admin.agregarFrase')} icon="plus" onPress={handleAddPhrase} />
      </Card>

      {phrases.length ? (
        <Card tone="flat">
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {t('admin.enUso', { count: phrases.length })}
          </ThemedText>
          {phrases.map((p) => (
            <View key={p.id} style={styles.row}>
              <ThemedText type="quote" style={styles.flex} numberOfLines={3}>
                {p.text}
              </ThemedText>
              <IconAction
                icon="trash-can-outline"
                label={t('admin.borrarFrase')}
                color={theme.danger}
                onPress={() => deletePhrase(p.id).then(load)}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('admin.tipNuevo')}
        </ThemedText>
        <Field
          label={t('common.titulo')}
          value={tipTitle}
          onChangeText={setTipTitle}
          placeholder={t('admin.placeholderTip')}
        />
        <Field
          label={t('common.detalle')}
          value={tipBody}
          onChangeText={setTipBody}
          multiline
          numberOfLines={3}
        />
        <Button label={t('admin.agregarTip')} icon="plus" onPress={handleAddTip} />
      </Card>

      {tips.length ? (
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {t('admin.tipsPublicados', { count: tips.length })}
        </ThemedText>
      ) : null}

      {tips.map((tip) => (
        <Card key={tip.id}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <ThemedText type="default">{tip.title}</ThemedText>
              {tip.body ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {tip.body}
                </ThemedText>
              ) : null}
            </View>
            <IconAction
              icon="trash-can-outline"
              label={t('admin.borrarTip')}
              color={theme.danger}
              onPress={() => deleteTip(tip.id).then(load)}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  header: { gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
});