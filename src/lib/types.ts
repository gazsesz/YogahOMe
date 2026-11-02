// Az ászanatár adatai (data/aszanak.json) és az óravázlat típusai.

export type Angles2 = [number, number] | [number, number, number];

export interface Figure {
  t: number;
  h?: number;
  c?: number;
  ts?: number;
  fc?: number;
  a: Angles2;
  b: Angles2;
  l: Angles2;
  r: Angles2;
  v?: 'f';
  wall?: boolean | number;
  strap?: boolean | number;
}

export type Kind = 'asana' | 'mudra' | 'pranayama' | 'sequence';

/** Az ászanák, mudrák és pránájámák közös adatai (szűrés, óravázlat, figyelmeztetés). */
export interface Practice {
  id: string;
  sanskrit: string;
  hu: string;
  en: string;
  category: string;
  level: 1 | 2 | 3;
  traditions?: string[];
  steps: string[];
  benefits: string;
  cautions: string;
  chakras: { primary: number; secondary: number[]; note?: string };
  benefitAreas: string[];
  /** Az öt elem (föld, víz, tűz, levegő, éter) a csakrákból származtatva. */
  elements: { primary: string; secondary: string[] };
}

export type Position = 'allo' | 'terdelo' | 'kez' | 'ulo' | 'hason' | 'haton' | 'oldal';
export type Phase = 'bemelegites' | 'fo' | 'levezetes' | 'relaxacio';

export interface Pose extends Practice {
  traditions: string[];
  figure: Figure;
  // v6 gyakorlási mezők (scripts/adat/pozadat.py) az óragenerátorhoz.
  /** Oldalanként végzendő. */
  sided: boolean;
  /** Testhelyzet (a sorrendhez: állótól a fekvésig). */
  position: Position;
  /** Erősített izomcsoportok: core, has, hat, kar, vall, lab, far. */
  strengthens: string[];
  /** Nyújtott területek: combhajlito, csipohajlito, csipo, agyek, mellkas, vall, gerinc, vadli, oldal, comb, nyak. */
  stretches: string[];
  /** Terhelés 1–5. */
  intensity: number;
  /** Hova illik az órában. */
  phases: Phase[];
  /** Panaszok (cautions.ts azonosítók), amelyeknél kerülendő. */
  avoidFor: string[];
  /** Javasolt ellenpóz. */
  counterpose?: string;
  /** Alap tartás. */
  hold: { breaths: number; sec: number };
}

/** Mudra vagy pránájáma. */
export interface Technique extends Practice {
  /** Pránájámánál a ritmus, arány. */
  pattern?: string;
  /** Ajánlott időtartam vagy ismétlésszám. */
  duration: string;
}

/** Egy lépés a dinamikus sorozatban: ászana + légzés + rövid instrukció. */
export interface FlowStep {
  pose: string;
  breath: 'be' | 'ki' | 'tart';
  cue?: string;
}

/** Dinamikus ászanasorozat (napüdvözlet, holdüdvözlet, vinyásza…). */
export interface Sequence extends Practice {
  traditions: string[];
  /** Oldalanként végzendő (egy kör egyik oldalt vezeti). */
  sided: boolean;
  /** Javasolt körszám az óravázlatban. */
  rounds: number;
  duration: string;
  flow: FlowStep[];
}

export interface SequenceData {
  version: number;
  kind: 'sequence';
  categories: Category[];
  items: Sequence[];
}

export interface TechniqueData {
  version: number;
  kind: 'mudra' | 'pranayama';
  categories: Category[];
  items: Technique[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Chakra {
  id: number;
  sanskrit: string;
  name: string;
  location: string;
  theme: string;
  color: string;
}

export interface Element {
  id: string;
  name: string;
  sanskrit: string;
  chakra: number;
  color: string;
  quality: string;
  practice: string;
}

export interface BenefitArea {
  id: string;
  name: string;
  reason: string;
}

export interface Tradition {
  id: string;
  name: string;
}

export interface AsanaData {
  version: number;
  benefitAreas: BenefitArea[];
  chakras: Chakra[];
  elements: Element[];
  elementsNote: string;
  categories: Category[];
  traditions: Tradition[];
  levels: Record<string, string>;
  poses: Pose[];
}

export type Sides = 'nincs' | 'mindket' | 'jobb' | 'bal';

export interface PlanItem {
  key: string;
  /** Hiányzó érték = ászana (a korábbi mentésekkel való összhang miatt). */
  kind?: Kind;
  /** Az ászana, mudra vagy pránájáma azonosítója. */
  poseId: string;
  /** Tartási idő szabad szöveggel, pl. „5 légzés”, „3 perc”. */
  hold: string;
  sides: Sides;
  /** Ismétlésszám (sorozatoknál a körök száma); hiánya = nincs megadva. */
  reps?: number;
  note: string;
}

export interface PlanSection {
  key: string;
  title: string;
  items: PlanItem[];
}

export interface Plan {
  id: string;
  title: string;
  /** Az óra témája, szándéka. */
  theme: string;
  /** Célzott szint: 0 = vegyes. */
  level: 0 | 1 | 2 | 3;
  durationMin: number | null;
  tags: string[];
  /** Kímélendő területek, panaszok azonosítói (lásd cautions.ts). */
  conditions: string[];
  notes: string;
  sections: PlanSection[];
  /** Kedvencnek jelölt óra (a „Kedvencek” listában jelenik meg). */
  favorite?: boolean;
  /** Ha az órát a generátor készítette: a kérés (cél, idő, szint, kímélendő területek) és a változat. */
  generator?: { goal: string; option?: string; minutes: number; level: 1 | 2 | 3; avoid: string[]; variant: number };
  createdAt: string;
  updatedAt: string;
}

export interface SeriesDay {
  key: string;
  /** A nap címe, pl. „Föld – gyökerezés”. */
  title: string;
  /** A nap fókusza, szándéka. */
  focus: string;
  planId: string | null;
}

/** Tematika: egy téma lebontása több (jellemzően 7) napra, naponként egy óravázlattal. */
export interface Series {
  id: string;
  title: string;
  theme: string;
  notes: string;
  days: SeriesDay[];
  createdAt: string;
  updatedAt: string;
}
