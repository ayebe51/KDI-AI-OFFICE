// ==========================================================
// apps/web/src/office/scene/themeLoader.ts
// Loads and validates Tiled Map and Tileset Textures
// ==========================================================

import type { TiledMap } from './TiledMapRenderer';
import { getKdiTheme, type ThemeConfig } from './themeRegistry';

export function resolveThemeMap(theme: ThemeConfig): TiledMap {
  const m = JSON.parse(theme.mapRaw) as TiledMap;
  return {
    ...m,
    tilesets: theme.tilesets.map((t, i) => {
      if (t.embedded) return m.tilesets[i];
      const { url: _url, embedded: _embedded, ...meta } = t;
      return meta as TiledMap['tilesets'][number];
    }),
  };
}

export function themeTilesetUrls(theme: ThemeConfig): string[] {
  return theme.tilesets.map((t) => t.url);
}

export async function loadKdiTheme(): Promise<ThemeConfig> {
  return getKdiTheme();
}
