import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import type { Status } from './engine';
import * as db from './db';

/** Accent families used for icon tiles, pills and status colours. */
export type Accent = 'purple' | 'blue' | 'amber' | 'red' | 'green' | 'teal' | 'grey';
export type Tone = { fg: string; soft: string; text: string };

export interface Palette {
  dark: boolean;
  bg: string;
  card: string;
  surface: string; // inset fills: examples, options, segmented controls
  border: string;
  text: string;
  muted: string;
  primary: string;
  accent: Record<Accent, Tone>;
  status: Record<Status, Tone>;
}

const LIGHT_ACCENT: Record<Accent, Tone> = {
  purple: { fg: '#6D4AFF', soft: '#EFEAFF', text: '#5A37F0' },
  blue: { fg: '#3C7BF0', soft: '#E5EEFF', text: '#2A62D6' },
  amber: { fg: '#E9A100', soft: '#FFF3D6', text: '#9A6A00' },
  red: { fg: '#EF4E5E', soft: '#FFE6EA', text: '#D23445' },
  green: { fg: '#1FA463', soft: '#E3F6EC', text: '#137A47' },
  teal: { fg: '#14A598', soft: '#E0F5F3', text: '#0E7D73' },
  grey: { fg: '#6B6B76', soft: '#F0F0F4', text: '#6B6B76' },
};

const DARK_ACCENT: Record<Accent, Tone> = {
  purple: { fg: '#8B70FF', soft: '#28214A', text: '#BBA9FF' },
  blue: { fg: '#3C7BF0', soft: '#16233F', text: '#8DB1FF' },
  amber: { fg: '#E9A100', soft: '#33280F', text: '#F2C14E' },
  red: { fg: '#EF4E5E', soft: '#3A1A20', text: '#FF8A95' },
  green: { fg: '#1FA463', soft: '#16301F', text: '#6FDB9E' },
  teal: { fg: '#14A598', soft: '#123230', text: '#5ED8CC' },
  grey: { fg: '#9C9CA8', soft: '#24242A', text: '#9C9CA8' },
};

const statusOf = (a: Record<Accent, Tone>): Record<Status, Tone> => ({
  new: a.blue,
  familiar: a.amber,
  fluent: a.purple,
  mastered: a.green,
});

export const LIGHT: Palette = {
  dark: false,
  bg: '#F5F5F8',
  card: '#FFFFFF',
  surface: '#F0F0F4',
  border: '#E7E7EC',
  text: '#16161B',
  muted: '#6B6B76',
  primary: '#6D4AFF',
  accent: LIGHT_ACCENT,
  status: statusOf(LIGHT_ACCENT),
};

export const DARK: Palette = {
  dark: true,
  bg: '#0D0D10',
  card: '#1A1A1F',
  surface: '#24242A',
  border: '#2A2A31',
  text: '#F3F3F6',
  muted: '#9C9CA8',
  primary: '#8B70FF',
  accent: DARK_ACCENT,
  status: statusOf(DARK_ACCENT),
};

/** Onest weights (custom fonts need one family per weight). */
export const F: Record<'regular' | 'medium' | 'semibold' | 'bold', TextStyle> = {
  regular: { fontFamily: 'Onest_400Regular' },
  medium: { fontFamily: 'Onest_500Medium' },
  semibold: { fontFamily: 'Onest_600SemiBold' },
  bold: { fontFamily: 'Onest_700Bold' },
};

/** Coloured glow under primary buttons. */
export const glow = {
  shadowColor: '#6D4AFF',
  shadowOpacity: 0.45,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};

export type ThemeMode = 'light' | 'dark' | 'system';

interface Theme {
  c: Palette;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(() => (db.getSetting('theme') as ThemeMode) || 'system');
  const setMode = useCallback((m: ThemeMode) => {
    db.setSetting('theme', m);
    setModeState(m);
  }, []);
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = useMemo(() => ({ c: dark ? DARK : LIGHT, mode, setMode }), [dark, mode, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const t = useContext(Ctx);
  if (!t) throw new Error('useTheme outside ThemeProvider');
  return t;
}

/** Theme-aware StyleSheet: built once per palette. */
type Styles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends Styles>(fn: (c: Palette) => T & Styles) {
  const cache = new Map<Palette, Readonly<T>>();
  return () => {
    const { c } = useTheme();
    let s = cache.get(c);
    if (!s) cache.set(c, (s = StyleSheet.create(fn(c))));
    return s;
  };
}
