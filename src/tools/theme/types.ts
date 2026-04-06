export interface ThemeColors {
  bg_dark: string;
  bg_light: string;      // Also used as white/light text on dark backgrounds (LIGHT1)
  bg_surface: string;
  bg_surface_dk: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  text_muted_dk: string;
  accent: string;
  divider_dk: string;
  [key: string]: string;  // allow custom color keys
}

export interface ThemeFonts {
  heading: string;  // e.g. "Playfair Display"
  body: string;     // e.g. "Inter"
}

export interface ThemeRoleStyle {
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
  font: 'heading' | 'body';  // resolved to actual font family from theme.fonts
  color: string;              // key from ThemeColors (e.g. "text_primary") or hex string
  alignment?: string;
  lineSpacing?: number;
}

export interface Theme {
  colors: ThemeColors;
  fonts: ThemeFonts;
  roles: {
    title: ThemeRoleStyle;
    h1: ThemeRoleStyle;
    h2: ThemeRoleStyle;
    subtitle: ThemeRoleStyle;
    body: ThemeRoleStyle;
    caption: ThemeRoleStyle;
    stat: ThemeRoleStyle;
    stat_label: ThemeRoleStyle;
    label: ThemeRoleStyle;
    card_title: ThemeRoleStyle;
    card_body: ThemeRoleStyle;
    button: ThemeRoleStyle;
    [key: string]: ThemeRoleStyle;  // allow custom roles
  };
}

// Default theme that gets used when no theme is provided
// Vallor brand: #4318FF accent, Inter font, dark panels (#181818)
export const DEFAULT_THEME: Theme = {
  colors: {
    bg_dark: '#181818',
    bg_light: '#FAFAFA',
    bg_surface: '#F0EEFF',
    bg_surface_dk: '#242424',
    text_primary: '#181818',
    text_secondary: '#46484D',
    text_muted: '#7A7C82',
    text_muted_dk: '#B0B2B8',
    accent: '#4318FF',
    divider_dk: '#3A3A3A',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  roles: {
    // Dark background roles (use bg_light = LIGHT1 for white text)
    title: { fontSize: 32, bold: true, font: 'heading', color: 'bg_light' },
    stat: { fontSize: 24, bold: true, font: 'heading', color: 'bg_light' },
    stat_label: { fontSize: 12, font: 'body', color: 'text_muted_dk' },
    button: { fontSize: 14, bold: true, font: 'body', color: 'bg_light', alignment: 'CENTER' },
    // Light background roles (use text_primary = DARK2 for dark text)
    h1: { fontSize: 24, bold: true, font: 'heading', color: 'text_primary' },
    h2: { fontSize: 18, bold: true, font: 'heading', color: 'text_primary' },
    subtitle: { fontSize: 14, font: 'body', color: 'text_secondary' },
    body: { fontSize: 12, font: 'body', color: 'text_secondary', lineSpacing: 150 },
    caption: { fontSize: 10, font: 'body', color: 'text_muted' },
    label: { fontSize: 9, bold: true, font: 'body', color: 'accent' },
    card_title: { fontSize: 14, bold: true, font: 'body', color: 'text_primary' },
    card_body: { fontSize: 12, font: 'body', color: 'text_secondary', lineSpacing: 150 },
  },
};
