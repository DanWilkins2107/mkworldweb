import { useState } from "react";
import { useTournament } from "../db/tournament";
import { TRACKS } from "../tracks";
import { AddPlayerModal } from "./AddPlayerModal";
import "./TournamentBanner.css";

export function TournamentBanner() {
  const tournament = useTournament();
  const [addOpen, setAddOpen] = useState(false);

  if (tournament === null) {
    return null;
  }

  if (tournament.status === "not-started") {
    return (
      <>
        <section className="tournament-banner tournament-banner-not-started">
          <h2>Tournament hasn't started yet</h2>
          <p>Sign up to join!</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setAddOpen(true)}
          >
            + Add Player
          </button>
        </section>
        {addOpen && <AddPlayerModal onClose={() => setAddOpen(false)} />}
      </>
    );
  }

  if (tournament.status === "finished") {
    return (
      <section className="tournament-banner tournament-banner-finished">
        <h2>Tournament complete!</h2>
      </section>
    );
  }

  // in-progress
  const weekKey = String(tournament.currentWeek);
  const week = tournament.weeks[weekKey];
  const track = week
    ? TRACKS.find((t) => t.slug === week.trackSlug)
    : undefined;

  return (
    <section className="tournament-banner tournament-banner-in-progress">
      <div className="tournament-week-label">
        Week {tournament.currentWeek} of 30
      </div>
      {track && (
        <>
          <img
            className="tournament-track-image"
            src={`/tracks/${track.slug}.png`}
            alt={track.displayName}
          />
          <div className="tournament-track-name">{track.displayName}</div>
        </>
      )}
    </section>
  );
}
