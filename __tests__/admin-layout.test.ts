import {
  DRAWER_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
  WIDE_BREAKPOINT,
  sidebarMode,
} from '@/lib/admin-layout';

describe('sidebarMode', () => {
  it.each([320, 390, 768])('en %ipx el sidebar va como drawer', (width) => {
    expect(sidebarMode(width)).toBe('drawer');
  });

  it('en el límite justo antes de 900 sigue en drawer', () => {
    expect(sidebarMode(WIDE_BREAKPOINT - 1)).toBe('drawer');
  });

  it.each([900, 1280, 1440])('en %ipx el sidebar queda fijo', (width) => {
    expect(sidebarMode(width)).toBe('fixed');
  });

  it('el drawer cabe en las pantallas más angostas', () => {
    expect(DRAWER_WIDTH).toBeLessThan(320);
  });

  it('el sidebar colapsado es más angosto que el desplegado', () => {
    expect(SIDEBAR_COLLAPSED_WIDTH).toBeLessThan(SIDEBAR_WIDTH);
  });
});
