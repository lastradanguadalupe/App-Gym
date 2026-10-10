import { resolveWheelActiveIndex, type WheelOption } from '@/lib/wheel';

// Rueda de datos corporales: no incluye un valor `null` en la lista.
const options: WheelOption<number>[] = [
  { value: 30, label: '30' },
  { value: 30.5, label: '30,5' },
  { value: 31, label: '31' },
];

// Rueda del panel del profe: `null` es una opción más (el "—").
const withNull: WheelOption<number>[] = [
  { value: null, label: '—' },
  { value: 1, label: '1' },
];

describe('resolveWheelActiveIndex', () => {
  it('resalta el valor elegido si está en la lista', () => {
    expect(resolveWheelActiveIndex(options, 31)).toBe(2);
  });

  it('usa la sugerencia cuando no hay valor (rueda sin elegir)', () => {
    expect(resolveWheelActiveIndex(options, null, 30.5)).toBe(1);
  });

  it('sin sugerencia, cae al primero', () => {
    expect(resolveWheelActiveIndex(options, null)).toBe(0);
  });

  it('si `null` es una opción real de la lista, la resalta', () => {
    expect(resolveWheelActiveIndex(withNull, null, 1)).toBe(0);
  });

  it('no cae en la sugerencia si hay un valor que no está en la lista', () => {
    // Un peso viejo como 72,3 fuera de la grilla no debe mostrar la sugerencia.
    expect(resolveWheelActiveIndex(options, 72.3, 30.5)).toBe(0);
  });

  it('funciona con opciones de texto', () => {
    const texts: WheelOption<string>[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ];
    expect(resolveWheelActiveIndex(texts, 'b', 'a')).toBe(1);
  });
});
