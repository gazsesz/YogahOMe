import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PROFILE, parseProfile, PROFILE_KEY, type Profile } from './profile';
import { getSetting, setSetting, useDb } from './store';

/** Az alapprofil betöltése és mentése (beállítások tábla, kulcs: profile:v1). */
export function useProfile() {
  const db = useDb();
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    getSetting(db, PROFILE_KEY)
      .then((raw) => setProfile(parseProfile(raw)))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [db]);
  const update = useCallback(
    (patch: Partial<Profile>) => {
      setProfile((cur) => {
        const next = { ...cur, ...patch };
        setSetting(db, PROFILE_KEY, JSON.stringify(next)).catch(() => undefined);
        return next;
      });
    },
    [db],
  );
  return { profile, loaded, update };
}
