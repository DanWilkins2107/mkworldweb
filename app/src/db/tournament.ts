import { get, onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";
import { database } from "../firebase";
import { TRACKS } from "../tracks";

export type TournamentStatus = "not-started" | "in-progress" | "finished";

export type Tournament = {
  status: TournamentStatus;
  currentWeek: number;
  weeks: Record<string, { trackSlug: string }>;
};

const TOURNAMENT_PATH = "/tournament";

const EMPTY_TOURNAMENT: Tournament = {
  status: "not-started",
  currentWeek: 0,
  weeks: {},
};

type RawTournament = {
  status?: TournamentStatus;
  currentWeek?: number;
  weeks?: Record<string, { trackSlug: string }> | null;
} | null;

function normalize(value: RawTournament): Tournament {
  if (!value) return EMPTY_TOURNAMENT;
  return {
    status: value.status ?? "not-started",
    currentWeek: typeof value.currentWeek === "number" ? value.currentWeek : 0,
    weeks: value.weeks ?? {},
  };
}

export function subscribeToTournament(
  callback: (t: Tournament) => void,
): () => void {
  const tRef = ref(database, TOURNAMENT_PATH);
  const unsubscribe = onValue(tRef, (snapshot) => {
    const value = snapshot.val() as RawTournament;
    callback(normalize(value));
  });
  return unsubscribe;
}

function pickRandomTrack(used: Set<string>): string {
  const available = TRACKS.filter((t) => !used.has(t.slug));
  if (available.length === 0) {
    throw new Error("No available tracks left to pick.");
  }
  const idx = Math.floor(Math.random() * available.length);
  return available[idx].slug;
}

export async function startTournament(): Promise<void> {
  const trackSlug = pickRandomTrack(new Set());
  await set(ref(database, TOURNAMENT_PATH), {
    status: "in-progress",
    currentWeek: 1,
    weeks: { "1": { trackSlug } },
  });
}

export async function pickNextWeekTrack(): Promise<void> {
  const tRef = ref(database, TOURNAMENT_PATH);
  const snapshot = await get(tRef);
  const current = normalize(snapshot.val() as RawTournament);
  if (current.status !== "in-progress") {
    throw new Error("Tournament is not in progress.");
  }
  if (current.currentWeek >= 30) {
    throw new Error("Tournament is already on its final week.");
  }
  const nextWeek = current.currentWeek + 1;
  if (current.weeks[String(nextWeek)]) {
    throw new Error(`Week ${nextWeek}'s track has already been picked.`);
  }
  const trackSlug = pickRandomTrack(usedTrackSlugs(current));
  await set(ref(database, `${TOURNAMENT_PATH}/weeks/${nextWeek}`), { trackSlug });
}

export async function advanceWeek(): Promise<void> {
  const tRef = ref(database, TOURNAMENT_PATH);
  const snapshot = await get(tRef);
  const current = normalize(snapshot.val() as RawTournament);
  if (current.status !== "in-progress") {
    throw new Error("Tournament is not in progress.");
  }
  if (current.currentWeek >= 30) {
    throw new Error("Tournament is already on its final week.");
  }
  const nextWeek = current.currentWeek + 1;
  if (!current.weeks[String(nextWeek)]) {
    throw new Error(`Week ${nextWeek}'s track has not been picked yet.`);
  }
  await set(ref(database, `${TOURNAMENT_PATH}/currentWeek`), nextWeek);
}

export async function resetTournament(): Promise<void> {
  await set(ref(database, TOURNAMENT_PATH), null);
}

export async function finishTournament(): Promise<void> {
  const tRef = ref(database, TOURNAMENT_PATH);
  const snapshot = await get(tRef);
  const current = normalize(snapshot.val() as RawTournament);
  if (current.status !== "in-progress") {
    throw new Error("Tournament is not in progress.");
  }
  if (current.currentWeek !== 30) {
    throw new Error("Tournament can only be finished after week 30.");
  }
  await set(ref(database, `${TOURNAMENT_PATH}/status`), "finished");
}

export function usedTrackSlugs(t: Tournament): Set<string> {
  const slugs = new Set<string>();
  for (const week of Object.values(t.weeks)) {
    if (week && typeof week.trackSlug === "string") {
      slugs.add(week.trackSlug);
    }
  }
  return slugs;
}

export function useTournament(): Tournament | null {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeToTournament(setTournament);
    return unsubscribe;
  }, []);
  return tournament;
}
