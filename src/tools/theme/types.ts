export interface ThemeColors {
  bg_dark: string;
  bg_light: string;
  bg_surface: string;
  bg_surface_dk: string;
  text_primary: string;
  text_inv: string;
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
export const DEFAULT_THEME: Theme = {
  colors: {
    bg_dark: '#0F172A',
    bg_light: '#FFFFFF',
    bg_surface: '#F1F5F9',
    bg_surface_dk: '#1E293B',
    text_primary: '#0F172A',
    text_inv: '#FFFFFF',
    text_secondary: '#64748B',
    text_muted: '#94A3B8',
    text_muted_dk: '#CBD5E1',
    accent: '#3B82F6',
    divider_dk: '#334155',
  },
  fonts: {
    heading: 'Google Sans',
    body: 'Google Sans',
  },
  roles: {
    title: { fontSize: 36, bold: true, font: 'heading', color: 'text_inv' },
    h1: { fontSize: 28, bold: true, font: 'heading', color: 'text_primary' },
    h2: { fontSize: 20, bold: true, font: 'heading', color: 'text_primary' },
    subtitle: { fontSize: 16, font: 'body', color: 'text_secondary' },
    body: { fontSize: 14, font: 'body', color: 'text_secondary', lineSpacing: 150 },
    caption: { fontSize: 11, font: 'body', color: 'text_muted' },
    stat: { fontSize: 48, bold: true, font: 'heading', color: 'text_inv' },
    stat_label: { fontSize: 14, font: 'body', color: 'text_muted_dk' },
    label: { fontSize: 9, bold: true, font: 'body', color: 'accent' },
    card_title: { fontSize: 16, bold: true, font: 'body', color: 'text_primary' },
    card_body: { fontSize: 14, font: 'body', color: 'text_secondary', lineSpacing: 150 },
    button: { fontSize: 16, bold: true, font: 'body', color: 'text_inv', alignment: 'CENTER' },
  },
};
