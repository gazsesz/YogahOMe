// Óragenerátor: célból, időtartamból, szintből és kímélendő területekből
// összeállít egy öt szakaszos órát a meglévő ászana-, sorozat- és légzésadatokból.
import { poseConditions } from './cautions';
import { KINDS, POSES, POSE_BY_ID, PRANAYAMAS, SEQUENCES } from './data';
import { GOAL_BY_ID, type Goal, type PhaseMult } from './goals';
import { DEFAULT_SECTIONS, newId } from './plan';
import type { Kind, Plan, PlanItem, Pose, Practice, Sequence } from './types';

export interface GenRequest {
  goal: string;
  /** Al-választó (erősítésnél izomcsoport). */
  option?: string;
  minutes: number;
  level: 1 | 2 | 3;
  /** Kímélendő területek (cautions.ts panasz-azonosítók). */
  avoid: string[];
}

export interface PlanGenerator extends GenRequest {
  variant: number;
}

export const VARIANTS = ['Kiegyensúlyozott', 'Lendületesebb', 'Nyugodtabb'] as const;

/** Alap szakaszidők percben: ráhangolódás, bemelegítés, fő rész, levezetés, relaxáció. */
const BASE: Record<number, PhaseMult> = {
  10: [1, 2, 4, 2, 1],
  15: [1, 3, 7, 2, 2],
  20: [1, 4, 10, 3, 2],
  30: [2, 5, 15, 4, 4],
  45: [3, 8, 22, 6, 6],
  60: [4, 10, 30, 8, 8],
  90: [5, 15, 45, 12, 13],
};

const VARIANT_MULT: PhaseMult[] = [
  [1, 1, 1, 1, 1],
  [0.8, 1.2, 1.15, 0.8, 0.8],
  [1.2, 0.8, 0.85, 1.25, 1.3],
];

const fmtMin = (m: number) => `${String(m).replace('.', ',')} perc`;
const roundHalf = (n: number) => Math.round(n * 2) / 2;

/** A szakaszok perce a teljes időhöz igazítva (fél percre kerekítve, legalább 0,5 perc). */
export function phaseMinutes(minutes: number, mult: PhaseMult = [1, 1, 1, 1, 1], variant = 0): number[] {
  const key = Object.keys(BASE).map(Number).reduce((a, b) => (Math.abs(b - minutes) < Math.abs(a - minutes) ? b : a));
  const raw = BASE[key].map((v, i) => v * mult[i] * VARIANT_MULT[variant % 3][i]);
  const sum = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((v) => Math.max(0.5, roundHalf((v / sum) * minutes)));
  // A kerekítési különbség a fő részhez kerül, hogy az összeg pontosan kijöjjön.
  out[2] = Math.max(1, roundHalf(out[2] + minutes - out.reduce((a, b) => a + b, 0)));
  return out;
}

/** Kis, determinisztikus véletlengenerátor (mulberry32), hogy egy változat újra előállítható legyen. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sorrend testhelyzet szerint: álló → kéztámasz → térdelő → hason → ülő → oldalt → háton. */
const POSITION: Record<string, number> = { allo: 0, kez: 1, terdelo: 2, hason: 3, ulo: 4, oldal: 5, haton: 6 };
const RELAX_ONLY = new Set(['savasana', 'advasana']);

/** Oldalanként végzendő-e a póz (data/aszanak.json → sided). */
export const isSidedPose = (p: Pose): boolean => p.sided;

interface Ctx {
  goal: Goal;
  req: GenRequest;
  variant: number;
  rand: () => number;
  maxLevel: number;
  avoid: Set<string>;
  categories: Record<string, number>;
  boost: Set<string>;
  muscles: Record<string, number>;
  stretches: Record<string, number>;
  used: Set<string>;
}

function allowed(ctx: Ctx, p: Practice, relaxPhase = false): boolean {
  if (p.level > ctx.maxLevel) return false;
  if (ctx.goal.avoidIds?.includes(p.id)) return false;
  const conds = poseConditions(p).filter((c) => ctx.avoid.has(c));
  // A pihenő pózok módosítással (párna, takaró) szinte mindig végezhetők: ott csak megjegyzést adunk.
  if (conds.length && !(relaxPhase || ('figure' in p && p.category === 'pihen'))) return false;
  return true;
}

function poseAllowed(ctx: Ctx, p: Pose, relaxPhase = false): boolean {
  if (!allowed(ctx, p, relaxPhase)) return false;
  if (ctx.goal.avoidCategories?.includes(p.category)) return false;
  if (ctx.goal.onlyCategories && !ctx.goal.onlyCategories.includes(p.category)) return false;
  return true;
}

function score(ctx: Ctx, p: Pose, phase: 'warm' | 'main' | 'cool'): number {
  let s = 0;
  for (const b of p.benefitAreas) s += ctx.goal.benefits[b] ?? 0;
  s += (ctx.categories[p.category] ?? 0) * 1.5;
  if (ctx.boost.has(p.id)) s += 4;
  for (const m of p.strengthens) s += (ctx.muscles[m] ?? 0) * 1.5;
  for (const t of p.stretches) s += ctx.stretches[t] ?? 0;
  if (ctx.variant === 1) s += p.intensity * 0.6;
  if (ctx.variant === 2) s += (['pihen', 'yin', 'elore'].includes(p.category) ? 1.5 : 0) - p.intensity * 0.6;
  if (phase === 'warm') s -= p.intensity;
  if (phase === 'cool') s -= p.intensity * 1.5;
  // Erősítő célnál a célzott izmokat nem dolgoztató pózok hátrébb kerülnek.
  if (phase === 'main' && Object.keys(ctx.muscles).length && !targets(ctx, p)) s -= 3;
  return s + ctx.rand() * 2.5;
}

/** A póz a kiválasztott izomcsoportok valamelyikét erősíti-e. */
const targets = (ctx: Ctx, p: Pose) => p.strengthens.some((m) => (ctx.muscles[m] ?? 0) >= 2);
/** Erősítő órában a célzott pózokat kétszer ismételjük (két sorozat), hogy kevés póz is elég terhelést adjon. */
const repsFor = (ctx: Ctx, p: Pose, phase: 'warm' | 'main' | 'cool') =>
  phase === 'main' && Object.keys(ctx.muscles).length && targets(ctx, p) ? 2 : 1;

function slotMinutes(p: Pose, phase: 'warm' | 'main' | 'cool'): number {
  if (p.category === 'yin') return phase === 'cool' ? 2 : 3;
  if (p.category === 'pihen') return phase === 'cool' ? 1.5 : 2;
  if (p.intensity >= 4) return isSidedPose(p) ? 1 : 0.75;
  return isSidedPose(p) ? 1.5 : 1;
}

function holdFor(p: Pose, phase: 'warm' | 'main' | 'cool'): string {
  if (p.category === 'yin' || p.category === 'pihen') return fmtMin(slotMinutes(p, phase));
  const side = isSidedPose(p) ? ' oldalanként' : '';
  const breaths = phase === 'warm' ? Math.min(p.hold.breaths, 5) : p.hold.breaths;
  return breaths > 0 ? `${breaths} légzés${side}` : fmtMin(slotMinutes(p, phase));
}

function noteFor(ctx: Ctx, p: Practice): string {
  return poseConditions(p).some((c) => ctx.avoid.has(c)) ? p.cautions : '';
}

function poseItem(ctx: Ctx, p: Pose, phase: 'warm' | 'main' | 'cool'): PlanItem {
  ctx.used.add(p.id);
  const reps = repsFor(ctx, p, phase);
  return {
    key: newId(),
    poseId: p.id,
    hold: holdFor(p, phase),
    sides: isSidedPose(p) ? 'mindket' : 'nincs',
    note: noteFor(ctx, p),
    ...(reps > 1 ? { reps } : {}),
  };
}

function techniqueItem(ctx: Ctx, kind: Kind, p: Practice, hold: string, extra: Partial<PlanItem> = {}): PlanItem {
  ctx.used.add(p.id);
  return { key: newId(), kind, poseId: p.id, hold, sides: 'nincs', note: noteFor(ctx, p), ...extra };
}

/** A legjobb pontszámú pózok kiválasztása, amíg a szakasz ideje ki nem telik. */
function fill(ctx: Ctx, pool: Pose[], minutes: number, phase: 'warm' | 'main' | 'cool'): Pose[] {
  const ranked = pool
    .filter((p) => !ctx.used.has(p.id))
    .map((p) => ({ p, s: score(ctx, p, phase) }))
    .sort((a, b) => b.s - a.s);
  const out: Pose[] = [];
  let t = 0;
  for (const { p } of ranked) {
    if (t >= minutes - 0.25) break;
    const m = slotMinutes(p, phase) * repsFor(ctx, p, phase);
    if (out.length && t + m > minutes + 0.25) continue;
    out.push(p);
    ctx.used.add(p.id);
    t += m;
  }
  return out.sort((a, b) => (POSITION[a.position] ?? 4) - (POSITION[b.position] ?? 4));
}

function pickPranayama(ctx: Ctx): Practice | undefined {
  const pref = KINDS.pranayama.byId[ctx.goal.openPranayama];
  if (pref && allowed(ctx, pref)) return pref;
  return PRANAYAMAS.find((p) => p.id === 'hasi-legzes');
}

function pickSequence(ctx: Ctx, ids: string[]): Sequence | undefined {
  const ok = ids.map((id) => SEQUENCES.find((s) => s.id === id)).filter((s): s is Sequence => !!s && allowed(ctx, s));
  if (!ok.length) return undefined;
  return ok[ctx.variant % ok.length];
}

/** Egy óra generálása. A `seed` és a `variant` együtt határozza meg az eredményt. */
export function generateClass(req: GenRequest, variant = 0, seed = 1): Plan {
  const goal = GOAL_BY_ID[req.goal];
  if (!goal) throw new Error(`Ismeretlen óratípus: ${req.goal}`);
  const option = goal.options?.find((o) => o.id === req.option) ?? goal.options?.[0];
  const ctx: Ctx = {
    goal,
    req,
    variant,
    rand: rng(seed * 31 + variant * 7919),
    maxLevel: goal.gentle ? 1 : req.level,
    avoid: new Set([...(goal.avoidConditions ?? []), ...req.avoid]),
    categories: option?.categories ?? goal.categories,
    boost: new Set([...(goal.boostIds ?? []), ...(option?.boostIds ?? [])]),
    muscles: option?.muscles ?? goal.muscles ?? {},
    stretches: goal.stretches ?? {},
    used: new Set(),
  };
  const [rahMin, warmMin, mainMin, coolMin, relaxMin] = phaseMinutes(req.minutes, goal.mult, variant);
  const pool = POSES.filter((p) => poseAllowed(ctx, p) && !RELAX_ONLY.has(p.id));
  const extras = (goal.coolExtra ?? []).map((id) => POSE_BY_ID[id]).filter((p) => p && poseAllowed(ctx, p));
  extras.forEach((p) => ctx.used.add(p.id));

  // 1. Ráhangolódás: légzőgyakorlat.
  const rah: PlanItem[] = [];
  const pr = pickPranayama(ctx);
  if (pr) rah.push(techniqueItem(ctx, 'pranayama', pr, fmtMin(rahMin)));

  // 2. Bemelegítés: dinamikus sorozat (ha az óratípus ajánl), a maradék időre gyengéd pózok.
  const warm: PlanItem[] = [];
  let warmLeft = warmMin;
  const seq = warmMin >= 2 ? pickSequence(ctx, option?.warmSequences ?? goal.warmSequences ?? []) : undefined;
  if (seq) {
    const perRound = seq.sided ? 2 : 1;
    const rounds = Math.max(1, Math.min(Math.max(seq.rounds, 2), Math.floor((warmMin * 0.75) / perRound)));
    warm.push(techniqueItem(ctx, 'sequence', seq, '', { reps: rounds, sides: seq.sided ? 'mindket' : 'nincs' }));
    warmLeft -= rounds * perRound;
  }
  if (warmLeft >= 0.75) {
    const warmPool = pool.filter((p) => p.phases.includes('bemelegites'));
    fill(ctx, warmPool, warmLeft, 'warm').forEach((p) => warm.push(poseItem(ctx, p, 'warm')));
  }

  // 3. Fő rész: a célhoz legjobban illő pózok, állótól a talajig rendezve, hátrahajlás után ellenpózzal.
  const mainPool = pool.filter(
    (p) =>
      (p.phases.includes('fo') && (p.category !== 'yin' || (ctx.categories.yin ?? 0) > 0)) ||
      (p.category === 'pihen' && (ctx.categories.pihen ?? 0) >= 2),
  );
  const main = fill(ctx, mainPool, mainMin, 'main');
  const mainItems: PlanItem[] = [];
  // Erősebb póz után (pl. hátrahajlás, fordított, csónak) az adat szerinti ellenpóz, ha még nem szerepelt.
  main.forEach((p, i) => {
    mainItems.push(poseItem(ctx, p, 'main'));
    const cp = p.counterpose ? POSE_BY_ID[p.counterpose] : undefined;
    const next = main[i + 1];
    if (cp && p.intensity >= 3 && !ctx.used.has(cp.id) && next?.id !== cp.id && poseAllowed(ctx, cp, true)) {
      const it = poseItem(ctx, cp, 'main');
      mainItems.push({ ...it, hold: '5 légzés', note: [`Ellenpóz (${p.hu} után).`, it.note].filter(Boolean).join(' ') });
    }
  });

  // 4. Levezetés: nyújtó, nyugtató pózok, a végén az óratípus záró pózai (pl. lábak a falon).
  const coolPool = pool.filter((p) => p.phases.includes('levezetes'));
  const extraMin = extras.reduce((t, p) => t + slotMinutes(p, 'cool'), 0);
  const cool: PlanItem[] = fill(ctx, coolPool, Math.max(0.5, coolMin - extraMin), 'cool').map((p) => poseItem(ctx, p, 'cool'));
  extras.forEach((p) => cool.push(poseItem(ctx, p, 'cool')));

  // 5. Relaxáció: savászana a maradék idővel.
  const relax: PlanItem[] = [];
  const sav = POSE_BY_ID['savasana'];
  if (sav) relax.push({ ...poseItem(ctx, sav, 'cool'), hold: fmtMin(relaxMin), note: noteFor(ctx, sav) });

  // Ha a kerekítések miatt túl hosszú lett, a fő rész végéről (az ellenpózt kímélve) elhagyunk pózokat.
  const draft = () => [rah, warm, mainItems, cool, relax].map((items, i) => ({ key: '', title: DEFAULT_SECTIONS[i], items }));
  while (mainItems.length > 2 && estimateMinutes({ sections: draft() } as Plan) > req.minutes + 1) {
    const idx = [...mainItems].reverse().findIndex((it) => !it.note.startsWith('Ellenpóz'));
    if (idx < 0) break;
    const k = mainItems.length - 1 - idx;
    mainItems.splice(k, 1);
    // A hozzá tartozó ellenpóz (közvetlenül utána) is megy vele.
    if (mainItems[k]?.note.startsWith('Ellenpóz')) mainItems.splice(k, 1);
  }

  const now = new Date().toISOString();
  const title = `${option && goal.options ? `${goal.name}: ${option.name}` : goal.name} – ${VARIANTS[variant % 3].toLowerCase()}`;
  const sections = [rah, warm, mainItems, cool, relax].map((items, i) => ({ key: newId(), title: DEFAULT_SECTIONS[i], items }));
  return {
    id: newId(),
    title,
    theme: goal.short,
    level: (goal.gentle ? 1 : req.level) as 1 | 2 | 3,
    durationMin: req.minutes,
    tags: [VARIANTS[variant % 3]],
    conditions: [...ctx.avoid],
    notes: goal.safety ?? '',
    sections,
    generator: { ...req, variant },
    createdAt: now,
    updatedAt: now,
  };
}

/** Három változat (kiegyensúlyozott, lendületesebb, nyugodtabb) ugyanarra a kérésre. */
export function generateVariants(req: GenRequest, seed = Date.now() % 100000): Plan[] {
  return VARIANTS.map((_, v) => generateClass(req, v, seed));
}

/** Egy mentett óra illik-e a kéréshez (ugyanaz a cél és nagyjából ugyanannyi idő). */
export function planMatches(plan: Plan, req: GenRequest): boolean {
  const g = plan.generator;
  if (!g || g.goal !== req.goal) return false;
  if ((g.option ?? '') !== (req.option ?? '') && GOAL_BY_ID[req.goal]?.options) return false;
  return Math.abs(g.minutes - req.minutes) <= Math.max(5, req.minutes * 0.25);
}

/** Becsült időtartam percben a szakaszok tartásaiból (ellenőrzéshez, tesztekhez). */
export function estimateMinutes(plan: Plan): number {
  let t = 0;
  for (const s of plan.sections)
    for (const it of s.items) {
      const m = /^([\d,.]+) perc/.exec(it.hold);
      if (m) t += Number(m[1].replace(',', '.'));
      else if (it.kind === 'sequence') t += (it.reps ?? 1) * (it.sides === 'mindket' ? 2 : 1);
      else t += (it.sides === 'mindket' ? 1.5 : 1) * (it.reps ?? 1);
    }
  return t;
}
