import type { Status } from './engine';

export const C = {
  bg: '#FBF7F0',
  card: '#FFFFFF',
  text: '#1E1E1E',
  muted: '#7A7468',
  border: '#E8E1D5',
  primary: '#1F7A4D',
  accent: '#C8402F',
  warn: '#C98A12',
  hint: '#BDB6A9',
};

export const STATUS_COLOR: Record<Status, string> = {
  new: '#4A7BD0',
  familiar: '#C98A12',
  fluent: '#8A5CC2',
  mastered: '#1F7A4D',
};

export const shadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
};
