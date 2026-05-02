import { useEffect, useState } from "react";
import { subscribeToPlayers, type Player } from "../db/players";
import {
  computeWeekRanking,
  formatTime,
  useTimes,
} from "../db/times";
import { useTournament } from "../db/tournament";
import { TRACKS } from "../tracks";
import "./AdminSlackMessages.css";

function buildAnnouncement(week: number, trackName: string, url: string): string {
  return `🏁 Week ${week}: ${trackName}
Submit your times here: ${url}`;
}

function buildReminder(week: number, trackName: string, url: string): string {
  return `⏰ Reminder! Don't forget to submit your time for Week ${week} (${trackName}).
${url}`;
}

function buildResults(
  week: number,
  trackName: string,
  url: string,
  rankedRows: { player: Player; ms: number; rank: number; points: number }[],
): string {
  const lines = [`🏆 Week ${week} results — ${trackName}`, ""];
  if (rankedRows.length === 0) {
    lines.push("(No times submitted)");
  } else {
    for (const row of rankedRows) {
      const who = row.player.slackName || row.player.name;
      lines.push(
        `${row.rank}. ${who} — ${formatTime(row.ms)} (${row.points} pts)`,
      );
    }
  }
  lines.push("", `Overall standings: ${url}`);
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
      // ignore — fall back to manual select
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

  useEffect(() => subscribeToPlayers(setPlayers), []);

  if (!tournament || !times || players === null) {
    return (
      <div className="admin-card admin-card-spaced">
        <h2>Slack messages</h2>
        <p>Loading…</p>
      </div>
    );
  }

  if (tournament.status !== "in-progress") {
    return (
      <div className="admin-card admin-card-spaced">
        <h2>Slack messages</h2>
        <p>Available once a tournament is in progress.</p>
      </div>
    );
  }

  const week = tournament.currentWeek;
  const weekData = tournament.weeks[String(week)];
  const track = weekData
    ? TRACKS.find((t) => t.slug === weekData.trackSlug)
    : null;
  const trackName = track?.displayName ?? "(unknown track)";
  const url = window.location.origin;

  const playerById = new Map(players.map((p) => [p.id, p]));
  const ranking = computeWeekRanking(times[String(week)] ?? {});
  const rankedRows = ranking
    .map((r) => {
      const player = playerById.get(r.playerId);
      return player ? { player, ms: r.ms, rank: r.rank, points: r.points } : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="admin-card admin-card-spaced">
      <h2>Slack messages — Week {week}</h2>
      <p className="slack-help">Copy these into Slack as needed.</p>
      <MessageBlock
        title="Week announcement"
        text={buildAnnouncement(week, trackName, url)}
      />
      <MessageBlock
        title="Reminder"
        text={buildReminder(week, trackName, url)}
      />
      <MessageBlock
        title="Results"
        text={buildResults(week, trackName, url, rankedRows)}
      />
    </div>
  );
}
