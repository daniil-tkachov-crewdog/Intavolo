// Reference sources each lesson's rules were checked against.
const WP = 'https://en.wikipedia.org/wiki/Italian_grammar';
const WB = 'https://en.wikibooks.org/wiki/Italian/Grammar';
const FSI = 'https://fsi-languages.yojik.eu/languages/FSI/fsi-italian-fast-updated.html';

export const S = {
  wp: (anchor, label) => [`Wikipedia – Italian grammar: ${label}`, `${WP}#${anchor}`],
  wpConj: ['Wikipedia – Italian conjugation', 'https://en.wikipedia.org/wiki/Italian_conjugation'],
  wtVerbs: ['Wiktionary – Appendix: Italian verbs', 'https://en.wiktionary.org/wiki/Appendix:Italian_verbs'],
  wtNouns: ['Wiktionary – Appendix: Italian nouns', 'https://en.wiktionary.org/wiki/Appendix:Italian_nouns'],
  wt: (word) => [`Wiktionary – ${word}`, `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#Italian`],
  wb: (page, label = page) => [`Wikibooks – Italian grammar: ${label}`, `${WB}/${page.replace(/ /g, '_')}`],
  fsi: ['FSI Italian FAST – Language-usage notes & Appendix A', FSI],
};
