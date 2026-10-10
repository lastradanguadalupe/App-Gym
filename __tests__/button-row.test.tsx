import { render } from '@testing-library/react-native';
import { Dimensions, StyleSheet, View, type ViewStyle } from 'react-native';

import { BUTTON_ROW_STACK_WIDTH, ButtonRow } from '@/components/ui/button';

function setWindowWidth(width: number) {
  const dims = { width, height: 800, scale: 1, fontScale: 1 };
  Dimensions.set({ window: dims, screen: dims });
}

async function renderRow(width: number) {
  setWindowWidth(width);
  const { getByTestId } = await render(
    <ButtonRow testID="row">
      <View />
      <View />
    </ButtonRow>
  );
  return StyleSheet.flatten(getByTestId('row').props.style) as ViewStyle;
}

describe('ButtonRow', () => {
  it.each([320, 360, 390])('apila en %ipx para que el texto completo entre', async (width) => {
    const style = await renderRow(width);
    expect(style.flexDirection).toBe('column');
  });

  it('apila en el límite: 560px todavía es angosto', async () => {
    const style = await renderRow(BUTTON_ROW_STACK_WIDTH - 1);
    expect(style.flexDirection).toBe('column');
  });

  it('reparte en fila cuando hay ancho de sobra', async () => {
    const style = await renderRow(1024);
    expect(style.flexDirection).toBe('row');
  });
});