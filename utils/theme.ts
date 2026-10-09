import type { AppTheme, ThemeMode } from '../types';

const clampChannel = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

const toHex2 = (n: number) => n.toString(16).padStart(2, '0');

export function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return null;
  return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)];
}

/**
 * Pushes the accent colour into a range that stays readable on the current
 * background: light accents for the deep black theme, dark accents for the
 * solid white theme. Keeps a light mode accent usable as both fill and text.
 */
export function fitAccent(hex: string, theme: AppTheme): { hex: string; rgb: string; contrast: string } {
  const parsed = hexToRgb(hex);
  if (!parsed) {
    return { hex: '#E8E8E8', rgb: '232, 232, 232', contrast: '#000000' };
  }

  let [r, g, b] = parsed;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (theme === 'dark' && luminance < 0.62) {
    const t = (0.62 - luminance) / (1 - luminance);
    r = clampChannel(r + (255 - r) * t);
    g = clampChannel(g + (255 - g) * t);
    b = clampChannel(b + (255 - b) * t);
  } else if (theme === 'light' && luminance > 0.34) {
    const t = (luminance - 0.34) / (1 - 0.34);
    r = clampChannel(r * (1 - t));
    g = clampChannel(g * (1 - t));
    b = clampChannel(b * (1 - t));
  }

  const fitted: [number, number, number] = [r, g, b];
  const finalLuminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return {
    hex: `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`,
    rgb: fitted.join(', '),
    contrast: finalLuminance > 0.5 ? '#000000' : '#ffffff',
  };
}

export function applyAccent(theme: AppTheme, accent: string) {
  const root = document.documentElement;
  const { hex, rgb, contrast } = fitAccent(accent, theme);
  root.style.setProperty('--accent-color', hex);
  root.style.setProperty('--accent-rgb', rgb);
  root.style.setProperty('--accent-contrast', contrast);
}

const THEME_MODE_KEY = 'app_theme_mode';

export function getSavedThemeMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_MODE_KEY);
  return saved === 'light' || saved === 'system' ? saved : 'dark';
}

export function resolveThemeMode(mode: ThemeMode): AppTheme {
  if (mode === 'system') {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  }
  return mode;
}

/**
 * Persists the theme preference and applies the resolved theme to the
 * document. Returns the resolved concrete theme.
 */
export function applyThemeMode(mode: ThemeMode): AppTheme {
  const resolved = resolveThemeMode(mode);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.classList.toggle('dark', resolved === 'dark');
  localStorage.setItem(THEME_MODE_KEY, mode);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#000000' : '#ffffff');
  return resolved;
}
