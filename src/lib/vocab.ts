import data from '../../assets/vocab.json';

export interface Word {
  id: number;
  it: string;
  en: string[];
  ipa: string;
  pos: string;
  examples: { it: string; en: string }[];
  rank: number;
}

export const WORDS = data as Word[];
export const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]));
