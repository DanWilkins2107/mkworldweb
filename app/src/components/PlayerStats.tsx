import { usePlayers } from "../db/players";
import "./Records.css";
import "./PlayerStats.css";

export function PlayerStats() {
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
                  <button
                    type="button"
                    className="leaderboard-row-btn"
                    aria-label={`View ${player.name}'s stats`}
                  >
                    Stats
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
