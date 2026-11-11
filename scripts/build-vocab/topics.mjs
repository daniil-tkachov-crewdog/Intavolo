// Topic for a word from WordNet "lexicographer files" (noun.food, verb.motion, …).
// Uses the English translation's most common WordNet sense.
import fs from 'node:fs';
import path from 'node:path';

const LEXNAMES = [
  'adj.all', 'adj.pert', 'adv.all', 'noun.Tops', 'noun.act', 'noun.animal', 'noun.artifact', 'noun.attribute',
  'noun.body', 'noun.cognition', 'noun.communication', 'noun.event', 'noun.feeling', 'noun.food', 'noun.group',
  'noun.location', 'noun.motive', 'noun.object', 'noun.person', 'noun.phenomenon', 'noun.plant', 'noun.possession',
  'noun.process', 'noun.quantity', 'noun.relation', 'noun.shape', 'noun.state', 'noun.substance', 'noun.time',
  'verb.body', 'verb.change', 'verb.cognition', 'verb.communication', 'verb.competition', 'verb.consumption',
  'verb.contact', 'verb.creation', 'verb.emotion', 'verb.motion', 'verb.perception', 'verb.possession',
  'verb.social', 'verb.stative', 'verb.weather', 'adj.ppl',
];

const TOPIC = {
  'noun.Tops': 'Basics', 'noun.relation': 'Basics', 'verb.stative': 'Basics', 'adv.all': 'Basics',
  'noun.act': 'Actions', 'verb.change': 'Actions', 'verb.contact': 'Actions', 'verb.creation': 'Actions',
  'noun.animal': 'Animals',
  'noun.body': 'Body & Health', 'verb.body': 'Body & Health', 'verb.perception': 'Body & Health',
  'noun.communication': 'Communication', 'verb.communication': 'Communication',
  'adj.all': 'Descriptions', 'adj.pert': 'Descriptions', 'adj.ppl': 'Descriptions', 'noun.attribute': 'Descriptions', 'noun.shape': 'Descriptions',
  'noun.event': 'Events',
  'noun.feeling': 'Feelings', 'verb.emotion': 'Feelings',
  'noun.food': 'Food & Drink', 'verb.consumption': 'Food & Drink',
  'noun.artifact': 'Home & Objects',
  'noun.state': 'Life & Situations',
  'noun.cognition': 'Mind & Ideas', 'noun.motive': 'Mind & Ideas', 'verb.cognition': 'Mind & Ideas',
  'noun.possession': 'Money & Shopping', 'verb.possession': 'Money & Shopping',
  'noun.object': 'Nature', 'noun.phenomenon': 'Nature', 'noun.plant': 'Nature', 'noun.substance': 'Nature',
  'noun.process': 'Nature', 'verb.weather': 'Nature',
  'noun.quantity': 'Numbers & Quantity',
  'noun.group': 'People & Society', 'noun.person': 'People & Society', 'verb.social': 'People & Society',
  'noun.location': 'Places & Travel', 'verb.motion': 'Places & Travel',
  'verb.competition': 'Sports & Games',
  'noun.time': 'Time',
};

// Italian parts of speech that WordNet doesn't cover.
const POS_TOPIC = {
  num: 'Numbers & Quantity', intj: 'Communication', prep: 'Basics', conj: 'Basics', pron: 'Basics',
  det: 'Basics', article: 'Basics', particle: 'Basics',
};
const WN_POS = { noun: 'noun', verb: 'verb', adj: 'adj', adv: 'adv' };

export function loadTopics(dictDir) {
  const lex = {};
  for (const pos of ['noun', 'verb', 'adj', 'adv']) {
    const data = new Map();
    for (const l of fs.readFileSync(path.join(dictDir, `data.${pos}`), 'utf8').split('\n')) {
      if (!l || l.startsWith(' ')) continue;
      const [offset, filenum] = l.split(' ');
      data.set(offset, LEXNAMES[Number(filenum)]);
    }
    const index = new Map();
    for (const l of fs.readFileSync(path.join(dictDir, `index.${pos}`), 'utf8').split('\n')) {
      if (!l || l.startsWith(' ')) continue;
      const parts = l.trim().split(' ');
      const synsetCount = Number(parts[2]);
      const firstOffset = parts[parts.length - synsetCount]; // offsets are listed most-common first
      index.set(parts[0], data.get(firstOffset));
    }
    lex[pos] = index;
  }

  const lookup = (en, wnPos) => {
    const key = en.toLowerCase().replace(/^(to|the|a|an) /, '').replace(/[!?.]/g, '').trim().replace(/ /g, '_');
    return lex[wnPos]?.get(key);
  };

  return function topicFor(word) {
    if (POS_TOPIC[word.pos]) return POS_TOPIC[word.pos];
    const wnPos = WN_POS[word.pos];
    const tries = [word.en, ...word.alt];
    for (const en of tries) {
      const name = (wnPos && lookup(en, wnPos)) || null;
      if (name && TOPIC[name]) return TOPIC[name];
    }
    // Part of speech mismatch (e.g. Italian adj glossed by an English noun): try any WordNet pos.
    for (const en of tries) for (const p of ['noun', 'verb', 'adj', 'adv']) {
      const name = lookup(en, p);
      if (name && TOPIC[name]) return TOPIC[name];
    }
    return word.pos === 'adj' ? 'Descriptions' : word.pos === 'verb' ? 'Actions' : word.pos === 'adv' ? 'Basics' : 'Other';
  };
}
