import type { Plan, PlanItem, Practice } from './types';

/**
 * Csoportban gyakori panaszok. Az ászanák, mudrák és pránájámák
 * ellenjavallat-szövegeiben (Practice.cautions) keresünk rájuk utaló kifejezéseket.
 */
export interface Condition {
  id: string;
  name: string;
  pattern: RegExp;
}

export const CONDITIONS: Condition[] = [
  { id: 'magasvn', name: 'Magas vérnyomás', pattern: /magas vérnyomás/ },
  { id: 'alacsonyvn', name: 'Alacsony vérnyomás, szédülés', pattern: /alacsony vérnyomás|szédül/ },
  { id: 'terhes', name: 'Várandósság', pattern: /terhes|várandós/ },
  { id: 'nyak', name: 'Nyak', pattern: /nyak\w*\s?(sérül|panasz|probl|fájd)|nyaki (panasz|probl|sérül)/ },
  { id: 'vall', name: 'Váll', pattern: /váll\w*\s?(sérül|panasz|probl|fájd|delikát)|váll- /},
  { id: 'csuklo', name: 'Csukló', pattern: /csukló\w*\s?(sérül|panasz|probl|fájd)|csukló-/ },
  {
    id: 'derek',
    name: 'Derék, hát, gerinc',
    pattern: /derék|hát(sérül|fájd|panasz|probl)|ágyék|porckorong|isiász|gerinc\w*\s?(sérül|probl|panasz)/,
  },
  { id: 'csipo', name: 'Csípő', pattern: /csípő\w*\s?(sérül|panasz|probl|fájd)|csípőprotézis/ },
  { id: 'terd', name: 'Térd', pattern: /térd\w*\s?(sérül|panasz|fájd|probl|érzékeny)|ha a térd fáj/ },
  { id: 'boka', name: 'Boka, lábfej', pattern: /boka|bütyök|lábujjprobl/ },
  { id: 'combh', name: 'Combhajlító', pattern: /combhajlító/ },
  { id: 'szem', name: 'Glaukóma, szemnyomás', pattern: /glaukóm|szem\w*\s?(probl|nyomás|műtét)/ },
  { id: 'sziv', name: 'Szívbetegség', pattern: /szívbeteg|mellkasi fájdalom/ },
  { id: 'menstruacio', name: 'Menstruáció', pattern: /menstruáció/ },
  { id: 'hasi', name: 'Sérv, hasi műtét, fekély', pattern: /sérv|hasi műtét|fekély/ },
  { id: 'szorongas', name: 'Szorongás, pánik', pattern: /szorongás|pánik/ },
  { id: 'epilepszia', name: 'Epilepszia', pattern: /epilepszi/ },
];

export const CONDITION_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]));

/** Azok a panaszok, amelyekre a gyakorlat ellenjavallata kitér. */
export function poseConditions(p: Practice): string[] {
  const text = p.cautions.toLowerCase();
  const found = CONDITIONS.filter((c) => c.pattern.test(text)).map((c) => c.id);
  // Az ászanáknál az adat (avoidFor) szakmai szabályokkal is kiegészíti a szövegből felismert panaszokat.
  const extra = (p as Practice & { avoidFor?: string[] }).avoidFor ?? [];
  return [...new Set([...found, ...extra])];
}

export interface PlanWarning {
  sectionKey: string;
  itemKey: string;
  practice: Practice;
  /** A csoport jelzett panaszai közül azok, amelyeket a gyakorlat érint. */
  conditions: string[];
  /** A gyakorlat szintje magasabb, mint az óra célzott szintje. */
  levelTooHigh: boolean;
}

export function planWarnings(plan: Plan, lookup: (it: PlanItem) => Practice | undefined): PlanWarning[] {
  const out: PlanWarning[] = [];
  for (const s of plan.sections) {
    for (const it of s.items) {
      const practice = lookup(it);
      if (!practice) continue;
      const conditions = poseConditions(practice).filter((c) => plan.conditions.includes(c));
      const levelTooHigh = plan.level > 0 && practice.level > plan.level;
      if (conditions.length || levelTooHigh) {
        out.push({ sectionKey: s.key, itemKey: it.key, practice, conditions, levelTooHigh });
      }
    }
  }
  return out;
}
