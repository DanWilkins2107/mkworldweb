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

export type Medal = "gold" | "silver" | "bronze";

export type MedalGroup = {
  medal: Medal;
  playerIds: string[];
  ms: number;
};

export function getMedalsForTrack(
  trackSlug: string,
  allPlayerIds: string[],
  tournament: Tournament,
  allTimes: AllTimes,
  personalBests: PersonalBests,
): MedalGroup[] {
  const playerBests: { playerId: string; ms: number }[] = [];
  for (const pid of allPlayerIds) {
    const ms = getBestTimeForTrack(
      trackSlug,
      pid,
      tournament,
      allTimes,
      personalBests,
    );
    if (ms !== undefined) playerBests.push({ playerId: pid, ms });
  }
  if (playerBests.length === 0) return [];
  playerBests.sort((a, b) => a.ms - b.ms);
  const groups: { ms: number; playerIds: string[] }[] = [];
  for (const { playerId, ms } of playerBests) {
    const last = groups[groups.length - 1];
    if (last && last.ms === ms) last.playerIds.push(playerId);
    else groups.push({ ms, playerIds: [playerId] });
  }
  const medalNames: Medal[] = ["gold", "silver", "bronze"];
  const result: MedalGroup[] = [];
  let position = 1;
  for (const g of groups) {
    if (position > 3) break;
    result.push({ medal: medalNames[position - 1], playerIds: g.playerIds, ms: g.ms });
    position += g.playerIds.length;
  }
  return result;
}

export type MedalTally = {
  playerId: string;
  gold: number;
  silver: number;
  bronze: number;
};

export function computeMedalTable(
  trackSlugs: string[],
  allPlayerIds: string[],
  tournament: Tournament,
  allTimes: AllTimes,
  personalBests: PersonalBests,
): MedalTally[] {
  const tally = new Map<string, MedalTally>();
  for (const slug of trackSlugs) {
    const groups = getMedalsForTrack(
      slug,
      allPlayerIds,
      tournament,
      allTimes,
      personalBests,
    );
    for (const g of groups) {
      for (const pid of g.playerIds) {
        let entry = tally.get(pid);
        if (!entry) {
          entry = { playerId: pid, gold: 0, silver: 0, bronze: 0 };
          tally.set(pid, entry);
        }
        entry[g.medal] += 1;
      }
    }
  }
  return Array.from(tally.values()).filter(
    (t) => t.gold + t.silver + t.bronze > 0,
  );
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
