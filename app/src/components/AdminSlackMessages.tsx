import { useEffect, useMemo, useState } from "react";
import { subscribeToPlayers, type Player } from "../db/players";
import {
  computeOverallStandings,
  computeWeekRanking,
  formatTime,
  useTimes,
  type AllTimes,
} from "../db/times";
import { useTournament } from "../db/tournament";
import { TRACKS } from "../tracks";
import "./AdminSlackMessages.css";

function whoFor(player: Player): string {
  return player.slackName || player.name;
}

function slackLink(url: string, text: string): string {
  return `<${url}|${text}>`;
}

const DIGIT_NAMES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
] as const;

function rankEmoji(n: number): string {
  if (n === 1) return ":first_place_medal:";
  if (n === 2) return ":second_place_medal:";
  if (n === 3) return ":third_place_medal:";
  if (n >= 4 && n <= 9) return `:${DIGIT_NAMES[n]}:`;
  return `${n}.`;
}

function buildAnnouncement(week: number, trackName: string, url: string): string {
  return `*Week ${week}: ${trackName}*
Submit your times ${slackLink(url, "here")}.`;
}

function buildReminder(
  week: number,
  trackName: string,
  url: string,
  outstanding: Player[],
): string {
  const lines = [
    `*Reminder — Week ${week}: ${trackName}*`,
    `Don't forget to submit your time ${slackLink(url, "here")}.`,
  ];
  if (outstanding.length > 0) {
    lines.push("");
    lines.push(
      `Still waiting on: ${outstanding.map(whoFor).join(", ")}`,
    );
  }
  return lines.join("\n");
}

function buildResults(
  week: number,
  trackName: string,
  url: string,
  rankedRows: { player: Player; ms: number; rank: number; points: number }[],
  outstanding: Player[],
  overall: { player: Player; totalPoints: number }[],
): string {
  const lines = [`*Week ${week} results — ${trackName}*`, ""];
  if (rankedRows.length === 0) {
    lines.push("(No times submitted)");
  } else {
    for (const row of rankedRows) {
      lines.push(
        `${rankEmoji(row.rank)} ${whoFor(row.player)} — ${formatTime(row.ms)} (${row.points} pts)`,
      );
    }
  }
  if (outstanding.length > 0) {
    lines.push("");
    lines.push(`DNS: ${outstanding.map(whoFor).join(", ")}`);
  }
  if (overall.length > 0) {
    lines.push("", "*Overall standings*");
    overall.forEach((row, i) => {
      lines.push(`${i + 1}. ${whoFor(row.player)} — ${row.totalPoints} pts`);
    });
  }
  lines.push("", `Full leaderboard ${slackLink(url, "here")}.`);
  return lines.join("\n");
}

function MessageBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — user can select manually
    }
  }

  return (
    <div className="slack-message">
      <div className="slack-message-header">
        <h3>{title}</h3>
        <button type="button" className="btn-secondary slack-copy-btn" onClick={handleCopy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="slack-message-text">{text}</pre>
    </div>
  );
}

export function AdminSlackMessages() {
  const tournament = useTournament();
  const times = useTimes();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<number | null>(null);

  useEffect(() => subscribeToPlayers(setPlayers), []);

  // Highest week with a track set (could be currentWeek + 1 if pre-picked)
  const maxAvailableWeek = useMemo(() => {
    if (!tournament) return 0;
    const weekNums = Object.keys(tournament.weeks)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    return weekNums.length === 0 ? 0 : Math.max(...weekNums);
  }, [tournament]);

  if (!tournament || !times || players === null) {
    return (
      <div className="admin-card admin-card-spaced">
        <h2>Slack messages</h2>
        <p>Loading…</p>
      </div>
    );
  }

  if (tournament.status === "not-started" || maxAvailableWeek === 0) {
    return (
      <div className="admin-card admin-card-spaced">
        <h2>Slack messages</h2>
        <p>Available once a tournament is in progress.</p>
      </div>
    );
  }

  const selectedWeek = Math.min(
    Math.max(selectedOverride ?? tournament.currentWeek, 1),
    maxAvailableWeek,
  );
  const weekData = tournament.weeks[String(selectedWeek)];
  const track = weekData
    ? TRACKS.find((t) => t.slug === weekData.trackSlug)
    : null;
  const trackName = track?.displayName ?? "(unknown track)";
  const url = window.location.origin;

  const playerById = new Map(players.map((p) => [p.id, p]));
  const weekTimes = times[String(selectedWeek)] ?? {};
  const ranking = computeWeekRanking(weekTimes);
  const rankedRows = ranking
    .map((r) => {
      const player = playerById.get(r.playerId);
      return player ? { player, ms: r.ms, rank: r.rank, points: r.points } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const submittedIds = new Set(Object.keys(weekTimes));
  const outstanding = players.filter((p) => !submittedIds.has(p.id));

  // Standings as of the selected week — include only weeks <= selectedWeek
  const timesThroughWeek: AllTimes = {};
  for (const [w, wTimes] of Object.entries(times)) {
    if (Number(w) <= selectedWeek) timesThroughWeek[w] = wTimes;
  }
  const overall = computeOverallStandings(
    timesThroughWeek,
    players.map((p) => p.id),
  )
    .map((s) => {
      const player = playerById.get(s.playerId);
      return player ? { player, totalPoints: s.totalPoints } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const labelSuffix = selectedWeek > tournament.currentWeek
    ? " (upcoming)"
    : selectedWeek === tournament.currentWeek
      ? " (current)"
      : "";

  return (
    <div className="admin-card admin-card-spaced">
      <div className="slack-week-header">
        <h2>Slack messages</h2>
        <div className="slack-week-nav">
          <button
            type="button"
            className="leaderboard-week-arrow"
            onClick={() => setSelectedOverride(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek <= 1}
            aria-label="Previous week"
          >
            ‹
          </button>
          <span className="slack-week-label">Week {selectedWeek}{labelSuffix}</span>
          <button
            type="button"
            className="leaderboard-week-arrow"
            onClick={() => setSelectedOverride(Math.min(maxAvailableWeek, selectedWeek + 1))}
            disabled={selectedWeek >= maxAvailableWeek}
            aria-label="Next week"
          >
            ›
          </button>
        </div>
      </div>
      <MessageBlock
        title="Week announcement"
        text={buildAnnouncement(selectedWeek, trackName, url)}
      />
      <MessageBlock
        title="Reminder"
        text={buildReminder(selectedWeek, trackName, url, outstanding)}
      />
      <MessageBlock
        title="Results"
        text={buildResults(selectedWeek, trackName, url, rankedRows, outstanding, overall)}
      />
    </div>
  );
}
