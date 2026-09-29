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
          Contenido
        </ThemedText>
        <ThemedText type="display">Frases y tips</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Es lo que tus alumnos van a ver en su pantalla de inicio.
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Frase motivadora nueva
        </ThemedText>
        <Field
          value={phraseText}
          onChangeText={setPhraseText}
          placeholder="Escribí una frase motivadora..."
          multiline
        />
        <Button label="Agregar frase" icon="plus" onPress={handleAddPhrase} />
      </Card>

      {phrases.length ? (
        <Card tone="flat">
          <ThemedText type="eyebrow" themeColor="textSecondary">
            En uso ({phrases.length})
          </ThemedText>
          {phrases.map((p) => (
            <View key={p.id} style={styles.row}>
              <ThemedText type="quote" style={styles.flex} numberOfLines={3}>
                {p.text}
              </ThemedText>
              <IconAction
                icon="trash-can-outline"
                label="Borrar frase"
                color={theme.danger}
                onPress={() => deletePhrase(p.id).then(load)}
              />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Tip de alimentación nuevo
        </ThemedText>
        <Field label="Título" value={tipTitle} onChangeText={setTipTitle} placeholder="Ej: Hidratación constante" />
        <Field label="Detalle" value={tipBody} onChangeText={setTipBody} multiline numberOfLines={3} />
        <Button label="Agregar tip" icon="plus" onPress={handleAddTip} />
      </Card>

      {tips.length ? (
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Tips publicados ({tips.length})
        </ThemedText>
      ) : null}

      {tips.map((t) => (
        <Card key={t.id}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <ThemedText type="default">{t.title}</ThemedText>
              {t.body ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {t.body}
                </ThemedText>
              ) : null}
            </View>
            <IconAction
              icon="trash-can-outline"
              label="Borrar tip"
              color={theme.danger}
              onPress={() => deleteTip(t.id).then(load)}
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
  flex: { flex: 1 },
});