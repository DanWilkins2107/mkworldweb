import { useEffect, useMemo, useState } from "react";
import { subscribeToPlayers, type Player } from "../db/players";
import {
  computeOverallStandings,
  computeWeekRanking,
  formatTime,
  useTimes,
} from "../db/times";
import { useTournament } from "../db/tournament";
import "./Leaderboard.css";

type View = "week" | "overall";

export function Leaderboard() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const tournament = useTournament();
  const times = useTimes();
  const [view, setView] = useState<View>("week");
  const [selectedWeekOverride, setSelectedWeekOverride] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPlayers(setPlayers);
    return unsubscribe;
  }, []);

  const currentWeek = tournament?.currentWeek ?? 0;
  const selectedWeek =
    selectedWeekOverride !== null
      ? Math.min(selectedWeekOverride, currentWeek > 0 ? currentWeek : 1)
      : currentWeek > 0
        ? currentWeek
        : null;

  if (players === null || tournament === null || times === null) {
    return <div className="leaderboard-status">Loading…</div>;
  }

  if (players.length === 0) {
    return (
      <div className="leaderboard-empty">
        <p>No players yet — add the first one!</p>
        <p className="leaderboard-empty-hint">↑ Use the “+ Add Player” button above.</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={view === "week"}
          className={
            "leaderboard-tab" + (view === "week" ? " leaderboard-tab-active" : "")
          }
          onClick={() => setView("week")}
        >
          Week
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "overall"}
          className={
            "leaderboard-tab" + (view === "overall" ? " leaderboard-tab-active" : "")
          }
          onClick={() => setView("overall")}
        >
          Overall
        </button>
      </div>

      {view === "overall" ? (
        <OverallView players={players} times={times} />
      ) : (
        <WeekView
          players={players}
          times={times}
          tournamentStatus={tournament.status}
          currentWeek={tournament.currentWeek}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeekOverride}
        />
      )}
    </div>
  );
}

function OverallView({
  players,
  times,
}: {
  players: Player[];
  times: Record<string, Record<string, number>>;
}) {
  const playerById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of players) map.set(p.id, p);
    return map;
  }, [players]);

  const standings = useMemo(
    () => computeOverallStandings(times, players.map((p) => p.id)),
    [times, players],
  );

  return (
    <ol className="leaderboard">
      {standings.map((row, i) => {
        const player = playerById.get(row.playerId);
        if (!player) return null;
        const rank = i + 1;
        return (
          <li key={player.id} className={`leaderboard-row rank-${rank}`}>
            <span className="leaderboard-rank">{rank}</span>
            <img
              className="leaderboard-avatar"
              src={`/avatars/${player.avatar}.png`}
              alt={player.avatar}
              width={48}
              height={48}
            />
            <span className="leaderboard-name">{player.name}</span>
            <span className="leaderboard-points">
              <span className="leaderboard-points-value">{row.totalPoints}</span>
              <span className="leaderboard-points-label">pts</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function WeekView({
  players,
  times,
  tournamentStatus,
  currentWeek,
  selectedWeek,
  setSelectedWeek,
}: {
  players: Player[];
  times: Record<string, Record<string, number>>;
  tournamentStatus: "not-started" | "in-progress" | "finished";
  currentWeek: number;
  selectedWeek: number | null;
  setSelectedWeek: (n: number) => void;
}) {
  if (tournamentStatus === "not-started" || currentWeek === 0) {
    return (
      <div className="leaderboard-empty">
        <p>No tournament yet</p>
      </div>
    );
  }

  const week = selectedWeek ?? currentWeek;
  const weekTimes = times[String(week)] ?? {};
  const ranking = computeWeekRanking(weekTimes);
  const rankedIds = new Set(ranking.map((r) => r.playerId));
  const unranked = players.filter((p) => !rankedIds.has(p.id));

  const playerById = new Map<string, Player>();
  for (const p of players) playerById.set(p.id, p);

  const weekLabel = week === currentWeek ? "This week" : `Week ${week}`;

  return (
    <>
      <div className="leaderboard-week-header">
        <button
          type="button"
          className="leaderboard-week-arrow"
          onClick={() => setSelectedWeek(Math.max(1, week - 1))}
          disabled={week <= 1}
          aria-label="Previous week"
        >
          ‹
        </button>
        <span className="leaderboard-week-label">{weekLabel}</span>
        <button
          type="button"
          className="leaderboard-week-arrow"
          onClick={() => setSelectedWeek(Math.min(currentWeek, week + 1))}
          disabled={week >= currentWeek}
          aria-label="Next week"
        >
          ›
        </button>
      </div>
      <ol className="leaderboard">
        {ranking.map((row) => {
          const player = playerById.get(row.playerId);
          if (!player) return null;
          return (
            <li
              key={player.id}
              className={`leaderboard-row rank-${row.rank}`}
            >
              <span className="leaderboard-rank">{row.rank}</span>
              <img
                className="leaderboard-avatar"
                src={`/avatars/${player.avatar}.png`}
                alt={player.avatar}
                width={48}
                height={48}
              />
              <span className="leaderboard-name">{player.name}</span>
              <span className="leaderboard-time">{formatTime(row.ms)}</span>
            </li>
          );
        })}
        {unranked.map((player) => (
          <li key={player.id} className="leaderboard-row leaderboard-row-unranked">
            <span className="leaderboard-rank leaderboard-rank-empty">—</span>
            <img
              className="leaderboard-avatar"
              src={`/avatars/${player.avatar}.png`}
              alt={player.avatar}
              width={48}
              height={48}
            />
            <span className="leaderboard-name">{player.name}</span>
            <span className="leaderboard-time leaderboard-time-empty">—</span>
          </li>
        ))}
      </ol>
    </>
  );
}

