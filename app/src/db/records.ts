import type { AllTimes } from "./times";
import type { PersonalBests } from "./personalBests";
import type { Tournament } from "./tournament";

export function getTournamentTimeForTrack(
  trackSlug: string,
  playerId: string,
  tournament: Tournament,
  allTimes: AllTimes,
): number | undefined {
  for (const [week, w] of Object.entries(tournament.weeks)) {
    if (w && w.trackSlug === trackSlug) {
      const weekTimes = allTimes[week];
      if (weekTimes && typeof weekTimes[playerId] === "number") {
        return weekTimes[playerId];
      }
      return undefined;
    }
  }
  return undefined;
}

export function getBestTimeForTrack(
  trackSlug: string,
  playerId: string,
  tournament: Tournament,
  allTimes: AllTimes,
  personalBests: PersonalBests,
): number | undefined {
  const t = getTournamentTimeForTrack(trackSlug, playerId, tournament, allTimes);
  const pb = personalBests[trackSlug]?.[playerId];
  if (t === undefined && pb === undefined) return undefined;
  if (t === undefined) return pb;
  if (pb === undefined) return t;
  return Math.min(t, pb);
}

export function getRecordHoldersForTrack(
  trackSlug: string,
  allPlayerIds: string[],
  tournament: Tournament,
  allTimes: AllTimes,
  personalBests: PersonalBests,
): { holders: string[]; ms: number } | null {
  let bestMs: number | undefined = undefined;
  const playerBests = new Map<string, number>();
  for (const pid of allPlayerIds) {
    const ms = getBestTimeForTrack(
      trackSlug,
      pid,
      tournament,
      allTimes,
      personalBests,
    );
    if (ms === undefined) continue;
    playerBests.set(pid, ms);
    if (bestMs === undefined || ms < bestMs) bestMs = ms;
  }
  if (bestMs === undefined) return null;
  const holders = Array.from(playerBests.entries())
    .filter(([, ms]) => ms === bestMs)
    .map(([pid]) => pid)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return { holders, ms: bestMs };
}
