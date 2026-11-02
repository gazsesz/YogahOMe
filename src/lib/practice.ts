import { isSequence, itemKind, practiceOf } from './data';
import type { Kind, Plan, PlanItem } from './types';

// Gyakorlás mód: az óravázlatból időzített lépések sora. Egy lépés = egy póz
// egy oldalon, egy ismétlésben. A narráció szövegét is itt állítjuk össze, hogy
// tesztelhető legyen, és a képernyő csak lejátssza.

/** Egy légzés átlagos hossza másodpercben (lassú jógalégzés). */
export const BREATH_SEC = 6;
/** Ennyi idő jut a pózba helyezkedésre a légzésszámmal megadott tartások előtt. */
export const SETUP_SEC = 10;
/**
 * Légzésszámos tartásnál legalább ennyi idő jut egy lépésre (a pózba helyezkedéssel,
 * kijövetellel együtt). Ugyanez az óraterv időbecslése (estimateMinutes): oldal nélküli
 * póz 1 perc, oldalas póz 1,5 perc (oldalanként 45 mp), így a gyakorlás hossza az
 * óra választott idejéhez igazodik.
 */
export const MIN_STEP_SEC = 60;
export const MIN_SIDE_SEC = 45;
/** Sorozatoknál egy lépés (egy légzés) ideje. */
const FLOW_STEP_SEC = 4;

export type StepSide = 'jobb' | 'bal';

export interface PracticeStep {
  sectionIndex: number;
  sectionTitle: string;
  itemKey: string;
  kind: Kind;
  poseId: string;
  name: string;
  side?: StepSide;
  /** Ismétlés sorszáma és száma, ha egynél több. */
  rep?: { n: number; of: number };
  seconds: number;
  /** A tartás az óravázlatból, kiírásra (pl. „5 légzés oldalanként”). */
  holdLabel: string;
  /** Szakasz első lépése. */
  sectionStart: boolean;
  /** Ugyanannak az elemnek nem az első lépése (másik oldal, újabb kör). */
  repeat: boolean;
  note: string;
}

function parseMinutes(hold: string): number | null {
  const m = /([\d]+(?:[,.]\d+)?)\s*(?:–\s*[\d,.]+\s*)?perc/.exec(hold);
  return m ? Number(m[1].replace(',', '.')) : null;
}

function parseBreaths(hold: string): number | null {
  const m = /(\d+)\s*légzés/.exec(hold);
  return m ? Number(m[1]) : null;
}

function parseSeconds(hold: string): number | null {
  const m = /(\d+)\s*(?:mp|másodperc)/.exec(hold);
  return m ? Number(m[1]) : null;
}

/** Egy oldal, egy ismétlés ideje másodpercben. */
export function stepSeconds(it: PlanItem): number {
  const kind = itemKind(it);
  const p = practiceOf(it);
  const hold = it.hold ?? '';
  const min = parseMinutes(hold);
  if (min != null) return Math.round(min * 60);
  const sec = parseSeconds(hold);
  if (sec != null) return sec;
  const br = parseBreaths(hold);
  if (br != null) return Math.max(br * BREATH_SEC + SETUP_SEC, it.sides === 'mindket' ? MIN_SIDE_SEC : MIN_STEP_SEC);
  if (kind === 'sequence' && p && isSequence(p)) return Math.max(30, p.flow.length * FLOW_STEP_SEC);
  if (kind === 'asana' && p && 'hold' in p && typeof p.hold === 'object') {
    const h = (p as { hold: { breaths: number; sec: number } }).hold;
    return h.breaths ? h.breaths * BREATH_SEC + SETUP_SEC : h.sec || 45;
  }
  return kind === 'asana' ? 45 : 120;
}

/** Az óravázlat lépésekre bontva (üres szakaszok és ismeretlen gyakorlatok kimaradnak). */
export function buildSteps(plan: Plan): PracticeStep[] {
  const out: PracticeStep[] = [];
  plan.sections.forEach((s, si) => {
    let first = true;
    for (const it of s.items) {
      const p = practiceOf(it);
      if (!p) continue;
      const kind = itemKind(it);
      const sides: (StepSide | undefined)[] = it.sides === 'mindket' ? ['jobb', 'bal'] : it.sides === 'jobb' || it.sides === 'bal' ? [it.sides] : [undefined];
      // Sorozatnál a körök egy lépésben futnak (a körszám a lépés hosszát adja).
      const reps = kind === 'sequence' ? 1 : Math.max(1, it.reps ?? 1);
      const rounds = kind === 'sequence' ? Math.max(1, it.reps ?? 1) : 1;
      const secs = stepSeconds(it) * rounds;
      let repeat = false;
      for (let r = 1; r <= reps; r++)
        for (const side of sides) {
          out.push({
            sectionIndex: si,
            sectionTitle: s.title,
            itemKey: it.key,
            kind,
            poseId: it.poseId,
            name: p.hu,
            side,
            rep: reps > 1 ? { n: r, of: reps } : undefined,
            seconds: secs,
            holdLabel: kind === 'sequence' ? `${rounds} kör${side ? ' oldalanként' : ''}` : it.hold,
            sectionStart: first,
            repeat,
            note: it.note,
          });
          first = false;
          repeat = true;
        }
    }
  });
  return out;
}

export const totalSeconds = (steps: PracticeStep[]) => steps.reduce((t, s) => t + s.seconds, 0);

export function fmtClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const SIDE_TEXT: Record<StepSide, string> = { jobb: 'Jobb oldal.', bal: 'Bal oldal.' };

/** A tartás felolvasható alakja (az „oldalanként” nélkül, mert az oldalt külön mondjuk). */
function holdSpeech(step: PracticeStep): string {
  if (step.kind === 'sequence') return step.holdLabel.replace(' oldalanként', '') + '.';
  const h = step.holdLabel.replace(' oldalanként', '').trim();
  return h ? `${h}.` : '';
}

/** Az első instrukció a gyakorlat leírásából (rövid, egy mondat). */
function firstCue(step: PracticeStep): string {
  const p = practiceOf({ kind: step.kind, poseId: step.poseId });
  const cue = p?.steps?.[0] ?? '';
  return cue.length > 220 ? '' : cue;
}

/**
 * A lépés elején elhangzó szöveg. Szakaszváltáskor bejelenti az előző szakasz végét
 * és az újat; első előfordulásnál a gyakorlat első instrukcióját is felolvassa.
 */
export function stepSpeech(steps: PracticeStep[], i: number): string {
  const step = steps[i];
  const parts: string[] = [];
  if (step.sectionStart) {
    const prev = i > 0 ? steps[i - 1] : undefined;
    if (prev) parts.push(`Vége: ${prev.sectionTitle.toLowerCase()}.`);
    parts.push(`${step.sectionTitle}.`);
  }
  if (step.repeat) {
    if (step.side && steps[i - 1]?.side && steps[i - 1].side !== step.side) parts.push(`Másik oldal. ${SIDE_TEXT[step.side]}`);
    else if (step.rep) parts.push(`${step.rep.n}. kör. ${step.name}.`);
    else parts.push(`${step.name}.`);
  } else {
    parts.push(`${step.name}.`);
    if (step.side) parts.push(SIDE_TEXT[step.side]);
    const cue = firstCue(step);
    if (cue) parts.push(cue);
    parts.push(holdSpeech(step));
  }
  return parts.filter(Boolean).join(' ');
}

export const END_SPEECH = 'Az óra véget ért. Köszönöm, hogy gyakoroltál. Namaszte.';

/** Hangjelzés a lépés elején: szakaszváltáskor gong, egyébként halk csengő. */
export const stepSound = (step: PracticeStep): 'gong' | 'chime' => (step.sectionStart ? 'gong' : 'chime');
