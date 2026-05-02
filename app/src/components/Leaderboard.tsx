import { useEffect, useState } from "react";
import { subscribeToPlayers, type Player } from "../db/players";

export function Leaderboard() {
  const [players, setPlayers] = useState<Player[] | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPlayers((next) => setPlayers(next));
    return unsubscribe;
  }, []);

  if (players === null) {
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
    <ol className="leaderboard">
      {players.map((p, i) => (
        <li key={p.id} className="leaderboard-row">
          <span className="leaderboard-rank">#{i + 1}</span>
          <img
            className="leaderboard-avatar"
            src={`/avatars/${p.avatar}.png`}
            alt={p.avatar}
            width={48}
            height={48}
          />
          <span className="leaderboard-name">{p.name}</span>
        </li>
      ))}
    </ol>
  );
}
