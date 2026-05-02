import { onValue, ref, remove, set } from "firebase/database";
import { useEffect, useState } from "react";
import { database } from "../firebase";

export type WeekTimes = Record<string, number>;
export type AllTimes = Record<string, WeekTimes>;

const TIMES_PATH = "times";
const MAX_MS = 1_800_000;

export function subscribeToTimes(
  callback: (t: AllTimes) => void,
): () => void {
  const timesRef = ref(database, TIMES_PATH);
  const unsubscribe = onValue(timesRef, (snapshot) => {
    const value = snapshot.val() as AllTimes | null;
    if (!value) {
      callback({});
      return;
    }
    const out: AllTimes = {};
    for (const [week, weekVal] of Object.entries(value)) {
      if (!weekVal) continue;
      const cleaned: WeekTimes = {};
      for (const [pid, ms] of Object.entries(weekVal)) {
        if (typeof ms === "number") cleaned[pid] = ms;
      }
      out[week] = cleaned;
    }
    callback(out);
  });
  return unsubscribe;
}

export function useTimes(): AllTimes | null {
  const [times, setTimes] = useState<AllTimes | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeToTimes(setTimes);
    return unsubscribe;
  }, []);
  return times;
}

export async function setTime(
  week: number,
  playerId: string,
  ms: number,
): Promise<void> {
  if (!Number.isInteger(ms) || ms < 1 || ms > MAX_MS) {
    throw new Error(`Time must be an integer between 1 and ${MAX_MS} ms.`);
  }
  await set(ref(database, `${TIMES_PATH}/${week}/${playerId}`), ms);
}

export async function deleteTime(
  week: number,
  playerId: string,
): Promise<void> {
  await remove(ref(database, `${TIMES_PATH}/${week}/${playerId}`));
}

export function formatTime(ms: number): string {
  const totalMs = Math.max(0, Math.floor(ms));
  const minutes = Math.floor(totalMs / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const millis = totalMs % 1000;
  const ss = seconds.toString().padStart(2, "0");
  const ttt = millis.toString().padStart(3, "0");
  return `${minutes}:${ss}.${ttt}`;
}

export type ParseResult = { ok: true; ms: number } | { ok: false; error: string };

const ERR = "Time must be M:SS.TTT, e.g. 2:34.567";

export function parseMaskedTime(masked: string): ParseResult {
  const match = /^(\d+):(\d{2})\.(\d{3})$/.exec(masked);
  if (!match) return { ok: false, error: ERR };
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const millis = Number(match[3]);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(millis)) {
    return { ok: false, error: ERR };
  }
  if (seconds >= 60) return { ok: false, error: ERR };
  const ms = minutes * 60_000 + seconds * 1000 + millis;
  if (ms <= 0 || ms > MAX_MS) {
    return { ok: false, error: ERR };
  }
  return { ok: true, ms };
}

export const MKWII_POINTS = [15, 12, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0] as const;

export type WeekRow = {
  playerId: string;
  ms: number;
  rank: number;
  points: number;
};

function pointsForRank(rank: number): number {
  const idx = rank - 1;
  if (idx < 0) return 0;
  if (idx >= MKWII_POINTS.length) return 0;
  return MKWII_POINTS[idx];
}

export function computeWeekRanking(weekTimes: WeekTimes): WeekRow[] {
  const entries = Object.entries(weekTimes)
    .filter(([, ms]) => typeof ms === "number")
    .sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    });

  const rows: WeekRow[] = [];
  let lastMs: number | null = null;
  let lastRank = 0;
  for (let i = 0; i < entries.length; i++) {
    const [playerId, ms] = entries[i];
    const rank = lastMs !== null && ms === lastMs ? lastRank : i + 1;
    rows.push({ playerId, ms, rank, points: pointsForRank(rank) });
    lastMs = ms;
    lastRank = rank;
  }
  return rows;
}

export function computeOverallStandings(
  times: AllTimes,
  playerIds: string[],
): { playerId: string; totalPoints: number; weeksPlayed: number }[] {
  const totals = new Map<string, { totalPoints: number; weeksPlayed: number }>();
  for (const pid of playerIds) {
    totals.set(pid, { totalPoints: 0, weeksPlayed: 0 });
  }

  for (const weekTimes of Object.values(times)) {
    if (!weekTimes) continue;
    const rows = computeWeekRanking(weekTimes);
    for (const row of rows) {
      const cur = totals.get(row.playerId);
      if (!cur) continue; // ignore times for unknown players
      cur.totalPoints += row.points;
      cur.weeksPlayed += 1;
    }
  }

  return Array.from(totals.entries())
    .map(([playerId, v]) => ({ playerId, ...v }))
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.weeksPlayed !== a.weeksPlayed) return b.weeksPlayed - a.weeksPlayed;
      return a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0;
    });
}
