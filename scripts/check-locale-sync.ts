import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';

/**
 * Fails when the locale YAML files drift apart.
 *
 * This repo shipped with `vi.Common.E` where `en` had `Common.En`, and with
 * `Fields.Email` defined only in `vi` — both invisible until a user hit the exact
 * screen and saw a raw key. Type-safe `t()` keys catch a *call site* referencing a
 * key the reference locale lacks; this catches the other half, where a translation
 * file quietly falls behind.
 *
 * Plural keys are compared per language: `en` needs `_one`/`_other`, while `vi` has
 * a single `other` category, so their key sets are intentionally NOT identical.
 * Comparing raw key strings would produce false failures, so plural keys are
 * normalised to their base name and their suffixes validated against Intl.
 */

const REFERENCE_LOCALE = 'en';
const LOCALES = ['en', 'vi'] as const;
const PLURAL_SUFFIXES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;

/**
 * The plural categories `Intl.PluralRules` can return. Naming the type — rather than
 * carrying `string` around — is what lets `required.has(category)` typecheck against
 * `Set<LDMLPluralRule>` without a cast.
 */
type PluralCategory = (typeof PLURAL_SUFFIXES)[number];

type KeyInfo = {
  /** Key path with any plural suffix stripped, e.g. `Fields.Role`. */
  base: string;
  /** Plural category, when the key carried one. */
  category?: PluralCategory;
};

const localesDir = path.resolve(import.meta.dirname, 'data');

const flatten = (node: unknown, prefix = ''): string[] => {
  if (node === null || typeof node !== 'object') return [prefix];

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key)
  );
};

/** Narrows a raw key suffix to a plural category, so callers keep the precise type. */
const isPluralCategory = (value: string): value is PluralCategory =>
  (PLURAL_SUFFIXES as readonly string[]).includes(value);

const parseKey = (key: string): KeyInfo => {
  const lastUnderscore = key.lastIndexOf('_');
  if (lastUnderscore === -1) return { base: key };

  const suffix = key.slice(lastUnderscore + 1);
  if (!isPluralCategory(suffix)) return { base: key };

  return { base: key.slice(0, lastUnderscore), category: suffix };
};

const loadKeys = (locale: string): KeyInfo[] => {
  const file = path.join(localesDir, `${locale}.yaml`);
  const parsed = yaml.load(fs.readFileSync(file, 'utf8'));
  return flatten(parsed).map(parseKey);
};

const errors: string[] = [];

const keysByLocale = new Map<string, KeyInfo[]>(
  LOCALES.map((locale) => [locale, loadKeys(locale)])
);

const baseNames = (keys: KeyInfo[]) => new Set(keys.map((k) => k.base));
const referenceKeys = keysByLocale.get(REFERENCE_LOCALE)!;
const referenceBases = baseNames(referenceKeys);

for (const locale of LOCALES) {
  const keys = keysByLocale.get(locale)!;
  const bases = baseNames(keys);

  if (locale !== REFERENCE_LOCALE) {
    for (const base of referenceBases) {
      if (!bases.has(base))
        errors.push(`[${locale}] missing key present in ${REFERENCE_LOCALE}: ${base}`);
    }
    for (const base of bases) {
      if (!referenceBases.has(base))
        errors.push(`[${locale}] extra key absent from ${REFERENCE_LOCALE}: ${base}`);
    }
  }

  // Every plural key must supply exactly the categories the language actually uses.
  const required = new Set(new Intl.PluralRules(locale).resolvedOptions().pluralCategories);
  const pluralBases = new Set(keys.filter((k) => k.category).map((k) => k.base));

  for (const base of pluralBases) {
    const provided = new Set(
      keys.filter((k) => k.base === base && k.category).map((k) => k.category!)
    );

    for (const category of required) {
      if (!provided.has(category))
        errors.push(`[${locale}] plural key "${base}" is missing "_${category}"`);
    }
    for (const category of provided) {
      if (!required.has(category)) {
        errors.push(
          `[${locale}] plural key "${base}" defines "_${category}", which ${locale} never selects`
        );
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`❌ Locale files are out of sync (${errors.length} problem(s)):`);
  for (const error of errors) console.error(`   ${error}`);
  process.exit(1);
}

console.log(`✅ Locales in sync: ${LOCALES.join(', ')} (${referenceBases.size} keys)`);
