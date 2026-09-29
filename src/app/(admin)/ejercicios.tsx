import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { IconAction } from '@/components/ui/icon-action';
import { Screen } from '@/components/ui/screen';
import { createExercise, deleteExercise, fetchExercises, fetchMuscleGroups, updateExercise } from '@/lib/db';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise, MuscleGroup } from '@/types';

export default function AdminEjerciciosScreen() {
  const theme = useTheme();
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<(Exercise & { muscle_groups: MuscleGroup })[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [muscleId, setMuscleId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');

  const load = useCallback(async () => {
    try {
      const [mg, ex] = await Promise.all([fetchMuscleGroups(), fetchExercises()]);
      setMuscleGroups(mg);
      setExercises(ex as (Exercise & { muscle_groups: MuscleGroup })[]);
    } catch (e) {
      console.warn('Error cargando catálogo', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCreate() {
    setMessage(null);
    setError(null);
    if (!name.trim() || !muscleId) {
      setError('Completá nombre y elegí un músculo.');
      return;
    }
    setBusy(true);
    try {
      await createExercise({
        muscle_group_id: muscleId,
        name: name.trim(),
        instructions: instructions.trim() || 'Por completar.',
        image_url: imageUrl.trim() || null,
      });
      setName('');
      setInstructions('');
      setImageUrl('');
      setMessage('Ejercicio agregado al catálogo.');
      await load();
    } catch (e) {
      setError('No se pudo agregar el ejercicio.');
      console.warn(e);
    } finally {
      setBusy(false);
    }
  }

  function openEdit(ex: Exercise & { muscle_groups: MuscleGroup }) {
    setEditName(ex.name);
    setEditInstructions(ex.instructions ?? '');
    setEditImageUrl(ex.image_url ?? '');
    setEditingId(ex.id);
  }

  async function handleSaveEdit(id: number) {
    if (!editName.trim()) {
      setError('El nombre no puede quedar vacío.');
      return;
    }
    setBusy(true);
    try {
      await updateExercise(id, {
        name: editName.trim(),
        instructions: editInstructions.trim() || null,
        image_url: editImageUrl.trim() || null,
      });
      setEditingId(null);
      await load();
    } catch (e) {
      setError('No se pudo guardar el ejercicio.');
      console.warn(e);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteExercise(id);
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
          Catálogo
        </ThemedText>
        <ThemedText type="display">Ejercicios</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {exercises.length} ejercicios cargados, listos para armar rutinas.
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          Nuevo ejercicio
        </ThemedText>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Ej: Press de banca" />
        <Field
          label="Instrucciones (cómo se hace)"
          value={instructions}
          onChangeText={setInstructions}
          multiline
          numberOfLines={4}
          placeholder="Describí la ejecución paso a paso..."
        />
        <Field
          label="URL de la imagen (opcional)"
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
          autoComplete="off"
          placeholder="https://.../foto.png"
        />
        <ThemedText type="smallBold" themeColor="textSecondary">
          Grupo muscular
        </ThemedText>
        <View style={styles.chipsRow}>
          {muscleGroups.map((mg) => (
            <Chip key={mg.id} label={mg.name} selected={muscleId === mg.id} onPress={() => setMuscleId(mg.id)} />
          ))}
        </View>
        {message ? <ThemedText themeColor="success">{message}</ThemedText> : null}
        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}
        <Button label="Guardar ejercicio" icon="plus" onPress={handleCreate} loading={busy} />
      </Card>

      {muscleGroups.map((mg) => {
        const groupExercises = exercises.filter((ex) => ex.muscle_group_id === mg.id);
        if (!groupExercises.length) return null;
        return (
          <Card key={mg.id}>
            <ThemedText type="eyebrow" themeColor="text">
              {mg.name} · {groupExercises.length}
            </ThemedText>
            {groupExercises.map((ex) => (
              <View key={ex.id}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <ThemedText type="default">{ex.name}</ThemedText>
                    {ex.instructions ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {ex.instructions}
                      </ThemedText>
                    ) : null}
                  </View>
                  {editingId === ex.id ? (
                    <IconAction
                      icon="close"
                      label="Cerrar"
                      color={theme.textSecondary}
                      onPress={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <IconAction
                        icon="pencil-outline"
                        label="Editar"
                        color={theme.brandBright}
                        onPress={() => openEdit(ex)}
                      />
                      <IconAction
                        icon="trash-can-outline"
                        label="Borrar"
                        color={theme.danger}
                        onPress={() => handleDelete(ex.id)}
                      />
                    </>
                  )}
                </View>

                {editingId === ex.id ? (
                  <View style={styles.editBox}>
                    <Field label="Nombre" value={editName} onChangeText={setEditName} />
                    <Field
                      label="Instrucciones"
                      value={editInstructions}
                      onChangeText={setEditInstructions}
                      multiline
                      numberOfLines={3}
                    />
                    <Field
                      label="URL de la imagen"
                      value={editImageUrl}
                      onChangeText={setEditImageUrl}
                      autoCapitalize="none"
                      autoComplete="off"
                      placeholder="https://.../foto.png"
                    />
                    <Button
                      variant="outline"
                      label="Guardar"
                      icon="content-save-outline"
                      disabled={busy}
                      onPress={() => handleSaveEdit(ex.id)}
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: Spacing.five },
  header: { gap: Spacing.one },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  flex: { flex: 1 },
  editBox: { gap: Spacing.two, paddingBottom: Spacing.two },
});