import { onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { database } from "../firebase";

export type PersonalBests = Record<string, Record<string, number>>;

const PERSONAL_BESTS_PATH = "/personalBests";
const MAX_MS = 1_800_000;

export function subscribeToPersonalBests(
  callback: (pbs: PersonalBests) => void,
): () => void {
  const pbRef = ref(database, PERSONAL_BESTS_PATH);
  const unsubscribe = onValue(pbRef, (snapshot) => {
    const value = snapshot.val() as PersonalBests | null;
    if (!value) {
      callback({});
      return;
    }
    const out: PersonalBests = {};
    for (const [trackSlug, trackVal] of Object.entries(value)) {
      if (!trackVal) continue;
      const cleaned: Record<string, number> = {};
      for (const [pid, ms] of Object.entries(trackVal)) {
        if (typeof ms === "number") cleaned[pid] = ms;
      }
      out[trackSlug] = cleaned;
    }
    callback(out);
  });
  return unsubscribe;
}

export function usePersonalBests(): PersonalBests | null {
  const [pbs, setPbs] = useState<PersonalBests | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeToPersonalBests(setPbs);
    return unsubscribe;
  }, []);
  return pbs;
}

export async function setPersonalBest(
  trackSlug: string,
  playerId: string,
  ms: number,
): Promise<void> {
  if (!Number.isInteger(ms) || ms < 1 || ms > MAX_MS) {
    throw new Error(`Time must be an integer between 1 and ${MAX_MS} ms.`);
  }
  await set(
    ref(database, `${PERSONAL_BESTS_PATH}/${trackSlug}/${playerId}`),
    ms,
  );
}

export async function clearAllPersonalBests(): Promise<void> {
  await set(ref(database, PERSONAL_BESTS_PATH), null);
}
