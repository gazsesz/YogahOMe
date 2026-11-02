import { CONDITIONS } from './cautions';
import type { Plan } from './types';

// Alapprofil (beállítások): szint, krónikus panaszok, és a gyakorlás mód
// hangjainak alapértéke. Az egyes órák ezeket felülbírálhatják (Plan.practice),
// és az óra meg is jegyzi a saját beállítását.

export interface Profile {
  level: 1 | 2 | 3;
  /** Krónikus betegségek, tartós panaszok (cautions.ts azonosítók). Új óránál ezek alapból kímélve vannak. */
  conditions: string[];
  /** Magyar narráció gyakorláskor. */
  narration: boolean;
  /** Hangjelzés szakaszváltáskor és pózváltáskor. */
  sounds: boolean;
}

export const PROFILE_KEY = 'profile:v1';

export const DEFAULT_PROFILE: Profile = { level: 1, conditions: [], narration: true, sounds: true };

/** A profilban választható panaszok (a menstruáció nem krónikus, az az óránál választható). */
export const PROFILE_CONDITIONS = CONDITIONS.filter((c) => c.id !== 'menstruacio');

export function parseProfile(raw: string | null | undefined): Profile {
  if (!raw) return DEFAULT_PROFILE;
  try {
    const v = JSON.parse(raw) as Partial<Profile>;
    return {
      level: v.level === 2 || v.level === 3 ? v.level : 1,
      conditions: Array.isArray(v.conditions) ? v.conditions.filter((c) => typeof c === 'string') : [],
      narration: typeof v.narration === 'boolean' ? v.narration : DEFAULT_PROFILE.narration,
      sounds: typeof v.sounds === 'boolean' ? v.sounds : DEFAULT_PROFILE.sounds,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export interface AudioSettings {
  narration: boolean;
  sounds: boolean;
}

/** Az órára érvényes hangbeállítás: az óra saját beállítása, ha van, különben a profilé. */
export function effectiveAudio(plan: Pick<Plan, 'practice'>, profile: Profile): AudioSettings {
  return {
    narration: plan.practice?.narration ?? profile.narration,
    sounds: plan.practice?.sounds ?? profile.sounds,
  };
}

/** Eltér-e az óra beállítása a profiltól (ekkor mutatjuk a „Profil szerint” visszaállítást). */
export const hasOverride = (plan: Pick<Plan, 'practice'>) => plan.practice?.narration != null || plan.practice?.sounds != null;
