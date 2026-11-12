import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import * as Speech from 'expo-speech';
import * as db from './db';
import { applyAnswer, createProgress, type AnswerResult, type Outcome, type Progress, type Status } from './engine';

export const SPEECH_RATES = { Slow: 0.6, Normal: 0.9, Fast: 1.1 } as const;
export type SpeechRate = keyof typeof SPEECH_RATES;

interface Store {
  progress: Map<number, Progress>;
  skipped: Map<number, number>;
  speechRate: SpeechRate;
  addWord: (wordId: number, status: Status) => void;
  addWords: (wordIds: number[], status: Status) => void;
  skipWord: (wordId: number) => void;
  removeWord: (wordId: number) => void;
  answer: (wordId: number, outcome: Outcome) => AnswerResult | null;
  setSpeechRate: (r: SpeechRate) => void;
  speak: (text: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(() => new Map(db.loadProgress().map((p) => [p.wordId, p])));
  const [skipped, setSkipped] = useState(() => db.loadSkipped());
  const [speechRate, setRate] = useState<SpeechRate>(() => (db.getSetting('speechRate') as SpeechRate) || 'Normal');

  const put = useCallback((p: Progress) => {
    db.saveProgress(p);
    setProgress((m) => new Map(m).set(p.wordId, p));
    setSkipped((m) => {
      if (!m.has(p.wordId)) return m;
      const n = new Map(m);
      n.delete(p.wordId);
      return n;
    });
  }, []);

  const addWord = useCallback((wordId: number, status: Status) => put(createProgress(wordId, status, Date.now())), [put]);

  const addWords = useCallback((wordIds: number[], status: Status) => {
    const now = Date.now();
    const list = wordIds.map((id) => createProgress(id, status, now));
    db.transaction(() => list.forEach(db.saveProgress));
    setProgress((m) => {
      const n = new Map(m);
      for (const p of list) n.set(p.wordId, p);
      return n;
    });
    setSkipped((m) => {
      const n = new Map(m);
      for (const id of wordIds) n.delete(id);
      return n;
    });
  }, []);

  const skipWord = useCallback((wordId: number) => {
    const at = Date.now();
    db.saveSkipped(wordId, at);
    setSkipped((m) => new Map(m).set(wordId, at));
  }, []);

  const removeWord = useCallback((wordId: number) => {
    db.deleteProgress(wordId);
    setProgress((m) => {
      if (!m.has(wordId)) return m;
      const n = new Map(m);
      n.delete(wordId);
      return n;
    });
  }, []);

  const answer = useCallback(
    (wordId: number, outcome: Outcome) => {
      const p = progress.get(wordId);
      if (!p) return null;
      const r = applyAnswer(p, outcome, Date.now());
      if (r.progress !== p) put(r.progress);
      return r;
    },
    [progress, put]
  );

  const setSpeechRate = useCallback((r: SpeechRate) => {
    db.setSetting('speechRate', r);
    setRate(r);
  }, []);

  const speak = useCallback(
    (text: string) => {
      Speech.stop();
      Speech.speak(text, { language: 'it-IT', rate: SPEECH_RATES[speechRate] });
    },
    [speechRate]
  );

  const value = useMemo(
    () => ({ progress, skipped, speechRate, addWord, addWords, skipWord, removeWord, answer, setSpeechRate, speak }),
    [progress, skipped, speechRate, addWord, addWords, skipWord, removeWord, answer, setSpeechRate, speak]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
