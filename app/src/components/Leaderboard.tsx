import { useEffect, useMemo, useState } from "react";
import { subscribeToPlayers, type Player } from "../db/players";
import {
  computeOverallStandings,
  computeWeekRanking,
  deleteTime,
  formatTime,
  useTimes,
  type AllTimes,
} from "../db/times";
import { useTournament } from "../db/tournament";
import { TRACKS } from "../tracks";
import { EditPlayerModal } from "./EditPlayerModal";
import { StandingsChart } from "./StandingsChart";
import { SubmitTimeModal } from "./SubmitTimeModal";
import "./Leaderboard.css";

type View = "week" | "overall" | "graph";

export function Leaderboard() {
  const [players, setPlayers] = useState<Player[] | null>(null);
  const tournament = useTournament();
  const times = useTimes();
  const [view, setView] = useState<View>("week");
  const [selectedWeekOverride, setSelectedWeekOverride] = useState<number | null>(null);
  const [editPlayer, setEditPlayer] = useState<Player | null>(null);

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

  if (tournament.status === "not-started") {
    return (
      <div className="leaderboard-container">
        <PlayerList players={players} onEditPlayer={setEditPlayer} />
        {editPlayer && (
          <EditPlayerModal
            player={editPlayer}
            onClose={() => setEditPlayer(null)}
          />
        )}
      </div>
    );
  }

  // For overall standings + the graph: include weeks up to (but not including)
  // the current week when in-progress; include all 30 when finished.
  const lastIncludedWeek =
    tournament.status === "finished" ? 30 : tournament.currentWeek - 1;
  const completedTimes: AllTimes = {};
  for (const [w, wTimes] of Object.entries(times)) {
    if (Number(w) <= lastIncludedWeek) completedTimes[w] = wTimes;
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
        <button
          type="button"
          role="tab"
          aria-selected={view === "graph"}
          className={
            "leaderboard-tab" + (view === "graph" ? " leaderboard-tab-active" : "")
          }
          onClick={() => setView("graph")}
        >
          Graph
        </button>
      </div>

      {view === "overall" && (
        <OverallView
          players={players}
          times={completedTimes}
          throughWeek={lastIncludedWeek}
          onEditPlayer={setEditPlayer}
        />
      )}
      {view === "week" && (
        <WeekView
          players={players}
          times={times}
          tournamentStatus={tournament.status}
          currentWeek={tournament.currentWeek}
          selectedWeek={selectedWeek}
          setSelectedWeek={setSelectedWeekOverride}
          onEditPlayer={setEditPlayer}
        />
      )}
      {view === "graph" && (
        <StandingsChart
          players={players}
          times={completedTimes}
          throughWeek={lastIncludedWeek}
        />
      )}

      {editPlayer && (
        <EditPlayerModal
          player={editPlayer}
          onClose={() => setEditPlayer(null)}
        />
      )}
    </div>
  );
}

function WeekTrackInfo({ week }: { week: number }) {
  const tournament = useTournament();
  if (!tournament) return null;
  const w = tournament.weeks[String(week)];
  if (!w) return null;
  const track = TRACKS.find((t) => t.slug === w.trackSlug);
  if (!track) return null;
  return (
    <div className="leaderboard-track">
      <img
        className="leaderboard-track-image"
        src={`/tracks/${track.slug}.png`}
        alt={track.displayName}
      />
      <span className="leaderboard-track-name">{track.displayName}</span>
    </div>
  );
}

function PlayerList({
  players,
  onEditPlayer,
}: {
  players: Player[];
  onEditPlayer: (p: Player) => void;
}) {
  return (
    <ol className="leaderboard">
      {players.map((player, i) => (
        <li key={player.id} className="leaderboard-row">
          <span className="leaderboard-rank">{i + 1}</span>
          <PlayerButton player={player} onClick={() => onEditPlayer(player)} />
        </li>
      ))}
    </ol>
  );
}

function PlayerButton({
  player,
  onClick,
}: {
  player: Player;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="leaderboard-player"
      onClick={onClick}
      aria-label={`Edit ${player.name}`}
    >
      <img
        className="leaderboard-avatar"
        src={`/avatars/${player.avatar}.png`}
        alt={player.avatar}
        width={48}
        height={48}
      />
      <span className="leaderboard-name">{player.name}</span>
    </button>
  );
}

function OverallView({
  players,
  times,
  throughWeek,
  onEditPlayer,
}: {
  players: Player[];
  times: Record<string, Record<string, number>>;
  throughWeek: number;
  onEditPlayer: (p: Player) => void;
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
    <>
      <p className="leaderboard-through">
        {throughWeek > 0
          ? `Standings through week ${throughWeek}.`
          : "No completed weeks yet."}
      </p>
      <ol className="leaderboard">
      {standings.map((row) => {
        const player = playerById.get(row.playerId);
        if (!player) return null;
        return (
          <li key={player.id} className={`leaderboard-row rank-${row.rank}`}>
            <span className="leaderboard-rank">{row.rank}</span>
            <PlayerButton player={player} onClick={() => onEditPlayer(player)} />
            <span className="leaderboard-points">
              <span className="leaderboard-points-value">{row.totalPoints}</span>
              <span className="leaderboard-points-label">pts</span>
            </span>
          </li>
        );
      })}
      </ol>
    </>
  );
}

function WeekView({
  players,
  times,
  tournamentStatus,
  currentWeek,
  selectedWeek,
  setSelectedWeek,
  onEditPlayer,
}: {
  players: Player[];
  times: Record<string, Record<string, number>>;
  tournamentStatus: "not-started" | "in-progress" | "finished";
  currentWeek: number;
  selectedWeek: number | null;
  setSelectedWeek: (n: number) => void;
  onEditPlayer: (p: Player) => void;
}) {
  const [editPlayerId, setEditPlayerId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (tournamentStatus === "not-started" || currentWeek === 0) {
    return (
      <div className="leaderboard-empty">
        <p>No tournament yet</p>
      </div>
    );
  }

  const week = selectedWeek ?? currentWeek;
  const weekTimes = times[String(week)] ?? {};
  const validIds = new Set(players.map((p) => p.id));
  const ranking = computeWeekRanking(weekTimes, validIds);
  const rankedIds = new Set(ranking.map((r) => r.playerId));
  const unranked = players.filter((p) => !rankedIds.has(p.id));

  const playerById = new Map<string, Player>();
  for (const p of players) playerById.set(p.id, p);

  const weekLabel = week === currentWeek ? "This week" : `Week ${week}`;
  // Allow add/edit/remove on any played week (tournament is in-progress or finished by this point).
  const canEdit = true;

  async function handleRemove(playerId: string, name: string) {
    if (!window.confirm(`Remove ${name}'s time for this week?`)) return;
    setRemovingId(playerId);
    try {
      await deleteTime(week, playerId);
    } finally {
      setRemovingId(null);
    }
  }

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
      {week !== currentWeek && <WeekTrackInfo week={week} />}
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
              <PlayerButton player={player} onClick={() => onEditPlayer(player)} />
              <span className="leaderboard-time">{formatTime(row.ms)}</span>
              {canEdit && (
                <span className="leaderboard-row-actions">
                  <button
                    type="button"
                    className="leaderboard-row-btn"
                    onClick={() => setEditPlayerId(player.id)}
                    aria-label={`Edit ${player.name}'s time`}
                    disabled={removingId === player.id}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="leaderboard-row-btn leaderboard-row-btn-danger"
                    onClick={() => handleRemove(player.id, player.name)}
                    aria-label={`Remove ${player.name}'s time`}
                    disabled={removingId === player.id}
                  >
                    {removingId === player.id ? "…" : "Remove"}
                  </button>
                </span>
              )}
            </li>
          );
        })}
        {unranked.map((player) => (
          <li key={player.id} className="leaderboard-row leaderboard-row-unranked">
            <span className="leaderboard-rank leaderboard-rank-empty">—</span>
            <PlayerButton player={player} onClick={() => onEditPlayer(player)} />
            <span className="leaderboard-time leaderboard-time-empty">—</span>
            {canEdit && (
              <span className="leaderboard-row-actions">
                <button
                  type="button"
                  className="leaderboard-row-btn"
                  onClick={() => setEditPlayerId(player.id)}
                  aria-label={`Add ${player.name}'s time`}
                >
                  Add
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>

      {editPlayerId !== null && (
        <SubmitTimeModal
          week={week}
          players={players}
          existingTimes={weekTimes}
          initialPlayerId={editPlayerId}
          onClose={() => setEditPlayerId(null)}
        />
      )}
    </>
  );
}

