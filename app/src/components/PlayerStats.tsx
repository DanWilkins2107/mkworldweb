import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePlayers, type Player } from "../db/players";
import {
  computeOverallStandings,
  computeWeekRanking,
  formatTime,
  useTimes,
  type AllTimes,
} from "../db/times";
import {
  getBestTimeForTrack,
  getTournamentTimeForTrack,
} from "../db/records";
import { usePersonalBests, type PersonalBests } from "../db/personalBests";
import { useTournament, type Tournament } from "../db/tournament";
import { TRACKS } from "../tracks";
import { Trophy, colorForRank } from "./Trophy";
import "./Records.css";
import "./PlayerStats.css";

function getDetailId(): string | null {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "player-stats") return parts[1];
  return null;
}

export function PlayerStats() {
  const detailId = getDetailId();
  if (detailId) {
    return <PlayerStatsDetail playerId={detailId} />;
  }
  return <PlayerStatsList />;
}

function PlayerStatsList() {
  const players = usePlayers();
  const ready = players !== null;

  return (
    <>
      <header className="site-header">
        <h1>Player stats</h1>
      </header>

      <section className="records-panel">
        <a href="/" className="admin-back">← Back to leaderboard</a>

        {!ready ? (
          <div className="leaderboard-status">Loading…</div>
        ) : players.length === 0 ? (
          <div className="leaderboard-empty">
            <p>No players yet.</p>
          </div>
        ) : (
          <ol className="leaderboard">
            {players.map((player) => (
              <li key={player.id} className="leaderboard-row">
                <div className="leaderboard-player player-stats-player">
                  <img
                    className="leaderboard-avatar"
                    src={`/avatars/${player.avatar}.png`}
                    alt={player.avatar}
                    width={48}
                    height={48}
                  />
                  <span className="leaderboard-name">{player.name}</span>
                </div>
                <span className="leaderboard-row-actions">
                  <a
                    className="leaderboard-row-btn"
                    href={`/player-stats/${player.id}`}
                    aria-label={`View ${player.name}'s stats`}
                  >
                    Stats
                  </a>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function PlayerStatsDetail({ playerId }: { playerId: string }) {
  const players = usePlayers();
  const times = useTimes();
  const tournament = useTournament();
  const personalBests = usePersonalBests();
  const ready =
    players !== null &&
    times !== null &&
    tournament !== null &&
    personalBests !== null;

  const player: Player | null = useMemo(
    () => players?.find((p) => p.id === playerId) ?? null,
    [players, playerId],
  );

  const standing = useMemo(() => {
    if (!players || !times) return null;
    const standings = computeOverallStandings(
      times,
      players.map((p) => p.id),
    );
    return standings.find((s) => s.playerId === playerId) ?? null;
  }, [players, times, playerId]);

  const medals = useMemo(() => {
    const counts = { first: 0, second: 0, third: 0 };
    if (!players || !times) return counts;
    const validIds = new Set(players.map((p) => p.id));
    for (const weekTimes of Object.values(times)) {
      if (!weekTimes) continue;
      const ranking = computeWeekRanking(weekTimes, validIds);
      const row = ranking.find((r) => r.playerId === playerId);
      if (!row) continue;
      if (row.rank === 1) counts.first += 1;
      else if (row.rank === 2) counts.second += 1;
      else if (row.rank === 3) counts.third += 1;
    }
    return counts;
  }, [players, times, playerId]);

  const bestPlacement = useMemo<
    { rank: number; week: number; trackName: string | null; margin: number } | null
  >(() => {
    if (!players || !times || !tournament) return null;
    const validIds = new Set(players.map((p) => p.id));
    const trackNameBySlug = new Map(TRACKS.map((t) => [t.slug, t.displayName]));

    let best: {
      rank: number;
      week: number;
      trackName: string | null;
      margin: number;
    } | null = null;

    for (const [weekKey, weekTimes] of Object.entries(times)) {
      if (!weekTimes) continue;
      const week = Number(weekKey);
      const ranking = computeWeekRanking(weekTimes, validIds);
      const row = ranking.find((r) => r.playerId === playerId);
      if (!row) continue;

      // Margin over the next-placed player, as a fraction of their own time.
      const nextMs = ranking
        .filter((r) => r.ms > row.ms)
        .reduce<number | null>(
          (min, r) => (min === null || r.ms < min ? r.ms : min),
          null,
        );
      const margin = nextMs !== null ? (nextMs - row.ms) / row.ms : 0;

      const trackSlug = tournament.weeks[weekKey]?.trackSlug;
      const trackName =
        (trackSlug && trackNameBySlug.get(trackSlug)) || null;

      // Best = lowest rank; ties broken by the largest % lead over next place.
      if (
        best === null ||
        row.rank < best.rank ||
        (row.rank === best.rank && margin > best.margin)
      ) {
        best = { rank: row.rank, week, trackName, margin };
      }
    }
    return best;
  }, [players, times, tournament, playerId]);

  return (
    <>
      <header className="site-header">
        <h1>Player stats</h1>
      </header>

      <section className="records-panel">
        <a href="/player-stats" className="admin-back">← Back to players</a>

        {!ready ? (
          <div className="leaderboard-status">Loading…</div>
        ) : !player ? (
          <div className="leaderboard-empty">
            <p>Player not found.</p>
          </div>
        ) : (
          <>
            <div
              className="player-hero"
              style={{ ["--rank-color" as string]: colorForRank(standing?.rank ?? 0) }}
            >
              <div
                className="player-hero-bg"
                style={{ backgroundImage: `url(/avatars/${player.avatar}.png)` }}
                aria-hidden="true"
              />
              <div className="player-hero-content">
                <div className="player-hero-player">
                  <img
                    className="player-hero-avatar"
                    src={`/avatars/${player.avatar}.png`}
                    alt={player.avatar}
                    width={72}
                    height={72}
                  />
                  <h2 className="player-hero-name">{player.name}</h2>
                </div>

                <div className="player-hero-metrics">
                  <div className="player-hero-metric">
                    <span className="player-hero-value">
                      {standing?.totalPoints ?? 0}
                    </span>
                    <span className="player-hero-label">Total points</span>
                  </div>

                  <div className="player-hero-divider" aria-hidden="true" />

                  <div className="player-hero-metric">
                    <span className="player-hero-value player-hero-position">
                      <Trophy
                        color={colorForRank(standing?.rank ?? 0)}
                        size={36}
                        className="player-hero-trophy"
                      />
                      {standing ? ordinal(standing.rank) : "—"}
                    </span>
                    <span className="player-hero-label">Position</span>
                  </div>
                </div>

                <div className="player-hero-medals">
                  <span className="player-hero-medal" title="1st-place finishes">
                    <span className="player-hero-medal-icon">🥇</span>
                    {medals.first}
                  </span>
                  <span className="player-hero-medal" title="2nd-place finishes">
                    <span className="player-hero-medal-icon">🥈</span>
                    {medals.second}
                  </span>
                  <span className="player-hero-medal" title="3rd-place finishes">
                    <span className="player-hero-medal-icon">🥉</span>
                    {medals.third}
                  </span>
                </div>

                <div className="player-hero-best">
                  <span className="player-hero-best-label">Best placement</span>
                  <span className="player-hero-best-value">
                    <Trophy
                      color={colorForRank(bestPlacement?.rank ?? 0)}
                      size={24}
                      className="player-hero-trophy"
                    />
                    {bestPlacement ? ordinal(bestPlacement.rank) : "—"}
                    {bestPlacement?.trackName && (
                      <span className="player-hero-best-track">
                        on {bestPlacement.trackName}
                      </span>
                    )}
                  </span>
                  {bestPlacement && bestPlacement.margin > 0 && (
                    <span className="player-hero-best-margin">
                      {(bestPlacement.margin * 100).toFixed(2)}% faster than the
                      place below
                    </span>
                  )}
                </div>
              </div>
            </div>

            <PlayerRival
              playerId={player.id}
              players={players}
              times={times}
            />

            <PlacementsChart
              playerId={player.id}
              players={players}
              times={times}
            />

            <TrackTimesList
              playerId={player.id}
              players={players}
              tournament={tournament}
              times={times}
              personalBests={personalBests}
            />
          </>
        )}
      </section>
    </>
  );
}

type Matchup = {
  opponent: Player;
  wins: number;
  losses: number;
  encounters: number;
};

function computeMatchups(
  playerId: string,
  players: Player[],
  times: AllTimes,
): Matchup[] {
  const validIds = new Set(players.map((p) => p.id));

  // Tally head-to-head record for every other player across shared weeks.
  const tally = new Map<string, { wins: number; losses: number }>();
  for (const weekTimes of Object.values(times)) {
    if (!weekTimes) continue;
    const ranking = computeWeekRanking(weekTimes, validIds);
    const mine = ranking.find((r) => r.playerId === playerId);
    if (!mine) continue;
    for (const other of ranking) {
      if (other.playerId === playerId) continue;
      const cur = tally.get(other.playerId) ?? { wins: 0, losses: 0 };
      if (mine.rank < other.rank) cur.wins += 1;
      else if (mine.rank > other.rank) cur.losses += 1;
      tally.set(other.playerId, cur);
    }
  }

  const playerById = new Map(players.map((p) => [p.id, p]));
  const out: Matchup[] = [];
  for (const [id, rec] of tally) {
    const encounters = rec.wins + rec.losses;
    if (encounters === 0) continue;
    const opponent = playerById.get(id);
    if (!opponent) continue;
    out.push({ opponent, wins: rec.wins, losses: rec.losses, encounters });
  }

  // Most-contested (win rate nearest 50/50) first, then most encounters.
  return out.sort((a, b) => {
    const da = Math.abs(a.wins / a.encounters - 0.5);
    const db = Math.abs(b.wins / b.encounters - 0.5);
    if (da !== db) return da - db;
    if (a.encounters !== b.encounters) return b.encounters - a.encounters;
    return a.opponent.name.localeCompare(b.opponent.name);
  });
}

function PlayerRival({
  playerId,
  players,
  times,
}: {
  playerId: string;
  players: Player[];
  times: AllTimes;
}) {
  const matchups = useMemo(
    () => computeMatchups(playerId, players, times),
    [playerId, players, times],
  );

  if (matchups.length === 0) return null;

  const rival = matchups[0];

  return (
    <div className="player-rival">
      <span className="player-rival-label">Closest rival</span>
      <div className="player-rival-body">
        <img
          className="player-rival-avatar"
          src={`/avatars/${rival.opponent.avatar}.png`}
          alt={rival.opponent.avatar}
          width={56}
          height={56}
        />
        <div className="player-rival-info">
          <span className="player-rival-name">{rival.opponent.name}</span>
          <span className="player-rival-record">
            {rival.wins}–{rival.losses} head-to-head
          </span>
        </div>
      </div>

      <span className="player-rival-label player-matchups-label">
        Head-to-head
      </span>
      <ul className="player-matchups">
        {matchups.map((m) => (
          <li key={m.opponent.id} className="player-matchup">
            <img
              className="player-matchup-avatar"
              src={`/avatars/${m.opponent.avatar}.png`}
              alt={m.opponent.avatar}
              width={36}
              height={36}
            />
            <span className="player-matchup-name">{m.opponent.name}</span>
            <span className="player-matchup-record">
              <span className="player-matchup-wins">{m.wins}</span>
              <span className="player-matchup-sep">–</span>
              <span className="player-matchup-losses">{m.losses}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type TrackTimeRow = {
  slug: string;
  displayName: string;
  ms: number | null;
  placement: number | null;
  field: number;
};

function TrackTimesList({
  playerId,
  players,
  tournament,
  times,
  personalBests,
}: {
  playerId: string;
  players: Player[];
  tournament: Tournament;
  times: AllTimes;
  personalBests: PersonalBests;
}) {
  const [includePbs, setIncludePbs] = useState(false);

  const rows = useMemo<TrackTimeRow[]>(() => {
    const allIds = players.map((p) => p.id);
    const getTime = (slug: string, pid: string): number | undefined =>
      includePbs
        ? getBestTimeForTrack(slug, pid, tournament, times, personalBests)
        : getTournamentTimeForTrack(slug, pid, tournament, times);

    const buildRow = (slug: string, displayName: string): TrackTimeRow => {
      const mine = getTime(slug, playerId);
      if (mine === undefined) {
        return { slug, displayName, ms: null, placement: null, field: 0 };
      }
      let faster = 0;
      let field = 0;
      for (const pid of allIds) {
        const t = getTime(slug, pid);
        if (t === undefined) continue;
        field += 1;
        if (pid !== playerId && t < mine) faster += 1;
      }
      return { slug, displayName, ms: mine, placement: faster + 1, field };
    };

    const trackBySlug = new Map(TRACKS.map((t) => [t.slug, t]));

    if (includePbs) {
      // Show the whole track list, in track-list order, including tracks
      // the player has not done yet (shown with no time).
      return TRACKS.map((track) => buildRow(track.slug, track.displayName));
    }

    // Tournament-only: show the tracks played so far, ordered by the week
    // they came up in.
    const weeks = Object.entries(tournament.weeks)
      .map(([week, w]) => ({ week: Number(week), trackSlug: w?.trackSlug }))
      .filter((w): w is { week: number; trackSlug: string } =>
        typeof w.trackSlug === "string",
      )
      .sort((a, b) => a.week - b.week);

    const out: TrackTimeRow[] = [];
    for (const { trackSlug } of weeks) {
      const track = trackBySlug.get(trackSlug);
      if (!track) continue;
      const row = buildRow(track.slug, track.displayName);
      if (row.ms !== null) out.push(row);
    }
    return out;
  }, [playerId, players, tournament, times, personalBests, includePbs]);

  return (
    <div className="track-times">
      <div className="track-times-header">
        <h3 className="track-times-title">Track times</h3>
        <label className="track-times-toggle">
          <input
            type="checkbox"
            checked={includePbs}
            onChange={(e) => setIncludePbs(e.target.checked)}
          />
          <span className="track-times-toggle-track" aria-hidden="true">
            <span className="track-times-toggle-thumb" />
          </span>
          <span className="track-times-toggle-label">
            Include personal bests
          </span>
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="standings-chart-empty">
          {includePbs
            ? "No track times recorded yet."
            : "No tournament track times yet. Toggle on personal bests to include them."}
        </p>
      ) : (
        <ul className="track-times-list">
          {rows.map((row) => (
            <li
              key={row.slug}
              className={
                "track-times-row" +
                (row.ms === null ? " track-times-row-empty" : "")
              }
            >
              <img
                className="track-times-image"
                src={`/tracks/${row.slug}.png`}
                alt={row.displayName}
                width={44}
                height={44}
              />
              <span className="track-times-name">{row.displayName}</span>
              {row.placement !== null ? (
                <span className="track-times-placement">
                  <Trophy
                    color={colorForRank(row.placement)}
                    size={20}
                    className="track-times-trophy"
                  />
                  {ordinal(row.placement)}
                  <span className="track-times-field">/ {row.field}</span>
                </span>
              ) : (
                <span className="track-times-placement track-times-placement-empty">
                  —
                </span>
              )}
              <span className="track-times-time">
                {row.ms === null ? "—" : formatTime(row.ms)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlacementsChart({
  playerId,
  players,
  times,
}: {
  playerId: string;
  players: Player[];
  times: AllTimes;
}) {
  const validIds = useMemo(() => new Set(players.map((p) => p.id)), [players]);

  const data = useMemo(() => {
    const weeks = Object.keys(times)
      .map(Number)
      .filter((w) => Number.isFinite(w))
      .sort((a, b) => a - b);

    const rows: { week: string; placement: number }[] = [];
    for (const w of weeks) {
      const ranking = computeWeekRanking(times[String(w)] ?? {}, validIds);
      const row = ranking.find((r) => r.playerId === playerId);
      if (row) rows.push({ week: `W${w}`, placement: row.rank });
    }
    return rows;
  }, [times, validIds, playerId]);

  const maxPlacement = Math.max(players.length, 1);

  return (
    <div className="standings-chart player-chart">
      <div className="standings-chart-header">
        <h3>Weekly placements</h3>
      </div>
      {data.length === 0 ? (
        <p className="standings-chart-empty">
          No weekly results yet for this player.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,27,42,0.15)" />
            <XAxis dataKey="week" stroke="#0d1b2a" />
            <YAxis
              stroke="#0d1b2a"
              reversed
              allowDecimals={false}
              domain={[1, maxPlacement]}
              tickFormatter={(v) => ordinal(Number(v))}
            />
            <Tooltip
              formatter={(v) => [ordinal(Number(v)), "Placement"]}
            />
            <Line
              type="linear"
              dataKey="placement"
              name="Placement"
              stroke="#e60012"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
