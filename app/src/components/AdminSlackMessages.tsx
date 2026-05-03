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

function nextFridayAt4pm(from: Date = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sun, 5 = Fri
  let daysUntilFri = (5 - day + 7) % 7;
  if (daysUntilFri === 0 && d.getHours() >= 16) daysUntilFri = 7;
  d.setDate(d.getDate() + daysUntilFri);
  d.setHours(16, 0, 0, 0);
  return d;
}

function formatDeadline(d: Date): string {
  const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
  const date = d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  let hours = d.getHours();
  const mins = d.getMinutes().toString().padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${weekday}, ${date} at ${hours}:${mins} ${period}`;
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

function buildAnnouncement(
  week: number,
  trackName: string,
  url: string,
  deadline: Date,
): string {
  return `*Week ${week}: ${trackName}*
Visit ${url} to submit your time.
Deadline: ${formatDeadline(deadline)}`;
}

function buildReminder(
  week: number,
  trackName: string,
  url: string,
  outstanding: Player[],
): string {
  const lines = [
    `*Reminder — Week ${week}: ${trackName}*`,
    `Visit ${url} to submit your time.`,
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
  overall: { player: Player; totalPoints: number; rank: number }[],
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
  if (overall.length > 0) {
    lines.push("", "*Overall standings*");
    for (const row of overall) {
      lines.push(`${row.rank}. ${whoFor(row.player)} — ${row.totalPoints} pts`);
    }
  }
  lines.push("", `Visit ${url} for the full leaderboard.`);
  return lines.join("\n");
}

function MessageBlock({
  title,
  text,
  footer,
}: {
  title: string;
  text: string;
  footer?: React.ReactNode;
}) {
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
      {footer && <div className="slack-message-footer">{footer}</div>}
    </div>
  );
}

function DeadlineControls({
  deadline,
  onShift,
}: {
  deadline: Date;
  onShift: (days: number) => void;
}) {
  return (
    <>
      <button
        type="button"
        className="leaderboard-week-arrow"
        onClick={() => onShift(-7)}
        aria-label="Move deadline back a week"
      >
        ‹
      </button>
      <span className="slack-deadline-label">{formatDeadline(deadline)}</span>
      <button
        type="button"
        className="leaderboard-week-arrow"
        onClick={() => onShift(7)}
        aria-label="Move deadline forward a week"
      >
        ›
      </button>
    </>
  );
}

export function AdminSlackMessages() {
  const tournament = useTournament();
  const times = useTimes();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [selectedOverride, setSelectedOverride] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<Date>(() => nextFridayAt4pm());

  function shiftDeadline(days: number) {
    setDeadline((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + days);
      return next;
    });
  }

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
  const validIds = new Set(players.map((p) => p.id));
  const weekTimes = times[String(selectedWeek)] ?? {};
  const ranking = computeWeekRanking(weekTimes, validIds);
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
      return player ? { player, totalPoints: s.totalPoints, rank: s.rank } : null;
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
        text={buildAnnouncement(selectedWeek, trackName, url, deadline)}
        footer={<DeadlineControls deadline={deadline} onShift={shiftDeadline} />}
      />
      <MessageBlock
        title="Reminder"
        text={buildReminder(selectedWeek, trackName, url, outstanding)}
      />
      <MessageBlock
        title="Results"
        text={buildResults(selectedWeek, trackName, url, rankedRows, overall)}
      />
    </div>
  );
}
