import { Theme } from './types.js';

/**
 * Map from our theme color keys to Google Slides ThemeColorType values.
 * These are written to the master page color scheme by applyThemeColorScheme().
 * Elements reference these via { themeColor: "ACCENT1" } etc.
 */
const COLOR_KEY_TO_THEME_COLOR: Record<string, string> = {
  bg_dark: 'DARK1',
  bg_light: 'LIGHT1',
  text_primary: 'DARK2',
  bg_surface: 'LIGHT2',
  accent: 'ACCENT1',
  bg_surface_dk: 'ACCENT2',
  text_secondary: 'ACCENT3',
  text_muted: 'ACCENT4',
  text_muted_dk: 'ACCENT5',
  divider_dk: 'ACCENT6',
};

/**
 * Resolve a color for the Google Slides API.
 * Uses native themeColor references when possible (inherits from master page).
 * Falls back to static rgbColor for hex values not in the theme.
 */
export function resolveColorForAPI(
  colorValue: string,
  theme?: Theme
): { themeColor: string } | { rgbColor: { red: number; green: number; blue: number } } {
  // 1. Check if it's a theme color key (e.g. "accent", "bg_dark", "bg_light")
  const themeColorType = COLOR_KEY_TO_THEME_COLOR[colorValue];
  if (themeColorType) {
    return { themeColor: themeColorType };
  }

  // 2. If it's a hex and we have a theme, check if it matches a theme color value
  if (theme && colorValue.startsWith('#')) {
    for (const [key, type] of Object.entries(COLOR_KEY_TO_THEME_COLOR)) {
      if ((theme.colors as any)[key]?.toUpperCase() === colorValue.toUpperCase()) {
        return { themeColor: type };
      }
    }
  }

  // 3. Fallback to static RGB
  const hex = theme ? (resolveColor(colorValue, theme) || colorValue) : colorValue;
  return { rgbColor: hexToRgbValues(hex) };
}

function hexToRgbValues(hex: string): { red: number; green: number; blue: number } {
  const h = hex.replace('#', '');
  return {
    red: parseInt(h.substring(0, 2), 16) / 255,
    green: parseInt(h.substring(2, 4), 16) / 255,
    blue: parseInt(h.substring(4, 6), 16) / 255,
  };
}

/**
 * Resolve an element spec through a theme: apply role defaults,
 * map color keys to hex values, map font keys to font families.
 * Per-element overrides always win over role defaults.
 *
 * No auto-swap logic. Each role has a fixed color token. Use dark-bg roles
 * (title, stat, stat_label, button) on dark slides and light-bg roles
 * (h1, h2, subtitle, body, caption, label, card_title, card_body) on light slides.
 */
export function resolveElement(element: any, theme: Theme, slideBgHex?: string): any {
  // If element has no role, return as-is
  if (!element.role) return element;

  const role = theme.roles[element.role];
  if (!role) return element;

  const resolved = { ...element };

  // Apply role defaults (only if element doesn't already specify)
  if (!resolved.fontSize && role.fontSize) resolved.fontSize = role.fontSize;
  if (resolved.bold === undefined && role.bold) resolved.bold = role.bold;
  if (resolved.italic === undefined && role.italic) resolved.italic = role.italic;
  if (!resolved.alignment && role.alignment) resolved.alignment = role.alignment;
  if (!resolved.lineSpacing && role.lineSpacing) resolved.lineSpacing = role.lineSpacing;

  // Resolve font family
  if (!resolved.fontFamily) {
    const fontKey = role.font;
    resolved.fontFamily = theme.fonts[fontKey] || fontKey;
  }

  // Resolve font color directly from the role (no auto-swap)
  if (!resolved.fontColor) {
    resolved.fontColor = resolveColor(role.color, theme) || role.color;
  }

  // Clean up: remove role field (not needed for slide_build)
  delete resolved.role;

  return resolved;
}

/**
 * Resolve a color value: if it's a theme color key, look it up;
 * if it's already a hex string, return as-is.
 */
export function resolveColor(colorValue: string | undefined, theme: Theme): string | undefined {
  if (!colorValue) return undefined;
  if (colorValue.startsWith('#')) return colorValue;  // already hex
  return (theme.colors as any)[colorValue] || colorValue;
}
