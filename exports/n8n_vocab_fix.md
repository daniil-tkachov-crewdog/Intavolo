# Intavolo – Vocabulary fix (n8n)

## 1. Output schema (one object per word)

```json
{
  "id": 123,
  "valid": true,
  "invalid_reason": null,
  "lemma": "porta",
  "pos": "noun",
  "gender": "f",
  "ipa": "/ˈpɔr.ta/",
  "level": "A1",
  "topic": "Home & Objects",
  "en_1": "door",
  "en_2": "gate",
  "en_3": null,
  "with_article": "la porta",
  "plural": "le porte",
  "adj_forms": null,
  "verb": null,
  "examples": [
    { "level": "A2", "it": "...", "en": "..." },
    { "level": "B1", "it": "...", "en": "..." },
    { "level": "C1", "it": "...", "en": "..." }
  ]
}
```

Rules:
- `valid`: `false` if not a real standard Italian word (English word, abbreviation, proper name, typo, foreign loan used only in English). Then all other fields except `id`, `invalid_reason` = `null`.
- `lemma`: base form (noun singular, adjective masc. singular, verb infinitive).
- `pos`: `noun | verb | adj | adv | prep | conj | pron | det | num | intj | article | particle`
- `gender`: `m | f | m/f | null` (nouns only)
- `level`: `A1 | A2 | B1 | B2 | C1 | C2` (CEFR level of the word itself)
- `topic`: one of `Basics, Nature, People & Society, Other, Descriptions, Body & Health, Communication, Money & Shopping, Actions, Places & Travel, Events, Home & Objects, Mind & Ideas, Life & Situations, Numbers & Quantity, Feelings, Food & Drink, Time, Animals, Sports & Games`
- `with_article`: definite article + lemma (`l'albero`, `lo zaino`). Nouns only, else `null`.
- `plural`: definite article + plural (`gli alberi`). Nouns only; invariable → same word; no plural → `null`.
- `adj_forms` (adjectives only, else `null`):
  `{ "m_sg": "bello", "f_sg": "bella", "m_pl": "belli", "f_pl": "belle" }`
- `verb` (verbs only, else `null`), all forms in "io" person:
  `{ "auxiliary": "avere", "present": "parlo", "past": "ho parlato", "future": "parlerò" }`
  (`past` = passato prossimo; reflexive verbs keep the pronoun: `mi lavo`, `mi sono lavato`)
- `examples`: exactly 3, levels A2, B1, C1 in that order, each must contain the word (any form), natural Italian, accurate English.

## 2. AI prompt

**System message**

```
You are an expert Italian lexicographer and CEFR-certified Italian teacher.
You receive ONE Italian vocabulary entry (id + word) from a language-learning app.
The data may be wrong: the word may be English, misspelled, a proper noun, or not in base form.

Return ONLY one JSON object, no markdown, no comments, matching exactly this schema:

{
  "id": number,                     // copy from input
  "valid": boolean,                 // false if not a real standard Italian word
  "invalid_reason": string|null,    // short reason if valid=false, else null
  "lemma": string|null,             // base form: noun sg, adj masc sg, verb infinitive
  "pos": "noun"|"verb"|"adj"|"adv"|"prep"|"conj"|"pron"|"det"|"num"|"intj"|"article"|"particle"|null,
  "gender": "m"|"f"|"m/f"|null,     // nouns only
  "ipa": string|null,               // e.g. "/ˈpɔr.ta/"
  "level": "A1"|"A2"|"B1"|"B2"|"C1"|"C2"|null,
  "topic": string|null,             // one of the allowed topics below
  "en_1": string|null,              // most common English translation
  "en_2": string|null,              // 2nd distinct meaning, or null
  "en_3": string|null,              // 3rd distinct meaning, or null
  "with_article": string|null,      // nouns: definite article + lemma ("l'albero", "lo zaino")
  "plural": string|null,            // nouns: definite article + plural ("gli alberi")
  "adj_forms": {"m_sg":string,"f_sg":string,"m_pl":string,"f_pl":string}|null,  // adjectives only
  "verb": {"auxiliary":"avere"|"essere","present":string,"past":string,"future":string}|null, // verbs only, "io" form; past = passato prossimo
  "examples": [                     // exactly 3, in this order
    {"level":"A2","it":string,"en":string},
    {"level":"B1","it":string,"en":string},
    {"level":"C1","it":string,"en":string}
  ]
}

Allowed topics: Basics, Nature, People & Society, Other, Descriptions, Body & Health,
Communication, Money & Shopping, Actions, Places & Travel, Events, Home & Objects,
Mind & Ideas, Life & Situations, Numbers & Quantity, Feelings, Food & Drink, Time,
Animals, Sports & Games.

Rules:
- English translations must be English words, never the Italian word repeated
  (unless it is a true loanword identical in both languages, e.g. "computer").
- Translations: lowercase, verbs start with "to " ("to speak"), no explanations.
- en_2/en_3 only for genuinely different common meanings, not synonyms of en_1.
- Fields that do not apply to the part of speech MUST be null.
- If valid=false: every field except id and invalid_reason is null and examples is [].
- Examples: natural, everyday Italian; each must contain the word (any form);
  difficulty must match the level (A2 short and simple, C1 complex/idiomatic).
- Never invent words. If unsure the word exists in standard Italian, set valid=false.
```

**User message** (n8n expression)

```
id: {{ $json.id }}
word: {{ $json.word }}
```

Model settings: temperature 0.2, JSON/structured output ON.

## 3. n8n flow

```
On form submission  →  Extract from File  →  Basic LLM Chain  →  Code (validate)  →  Convert to File
```

1. **n8n Form – On form submission**: 1 field, type **File**, label `file`. Upload `italian_words.csv`.
2. **Extract from File**: *Extract From CSV*, Input Binary Field `file`, Header Row on → 1 item per word.
3. **Basic LLM Chain**:
   - System message = prompt from section 2; user message = `id: {{ $json.id }} word: {{ $json.word }}`.
   - Sub-nodes: **Chat Model** (temp 0.2) + **Structured Output Parser** (schema from section 1).
   - Options → **Batch Processing**: Batch Size 20, Delay Between Batches 1000 ms (avoids rate limits).
   - Settings: Retry On Fail = 3, On Error = Continue.
4. **Code (validate)**, Run Once for Each Item:
   ```js
   const r = $json.output ?? $json;
   const errs = [];
   if (r.valid) {
     if (!r.en_1) errs.push('no en_1');
     if (r.en_1 && r.en_1.toLowerCase() === (r.lemma||'').toLowerCase()) errs.push('en = it');
     if (!Array.isArray(r.examples) || r.examples.length !== 3) errs.push('examples != 3');
     if (r.pos === 'noun' && (!r.with_article || !r.gender)) errs.push('noun fields missing');
     if (r.pos === 'verb' && !r.verb) errs.push('verb fields missing');
     if (r.pos === 'adj' && !r.adj_forms) errs.push('adj fields missing');
   }
   return { ...r, _errors: errs.join('; ') || null };
   ```
5. **Convert to File**: *Convert to JSON*, mode *All Items to One File* → download from the node output.

Test: put a **Limit** node (Max Items 20) between steps 2 and 3, remove it for the full run.
