import { useEffect, useState } from "react";
import { subscribeToPlayers, type Player } from "../db/players";
import { subscribeToTimes, type WeekTimes } from "../db/times";
import { useTournament } from "../db/tournament";
import { TRACKS } from "../tracks";
import { AddPlayerModal } from "./AddPlayerModal";
import { SubmitTimeModal } from "./SubmitTimeModal";
import "./TournamentBanner.css";

export function TournamentBanner() {
  const tournament = useTournament();
  const [addOpen, setAddOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [weekTimes, setWeekTimes] = useState<WeekTimes>({});

  const inProgress = tournament?.status === "in-progress";
  const currentWeek = tournament?.currentWeek ?? 0;

  useEffect(() => {
    if (!inProgress) return;
    const unsub = subscribeToPlayers(setPlayers);
    return unsub;
  }, [inProgress]);

  useEffect(() => {
    if (!inProgress || currentWeek === 0) return;
    const unsub = subscribeToTimes((all) => {
      setWeekTimes(all[String(currentWeek)] ?? {});
    });
    return unsub;
  }, [inProgress, currentWeek]);

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
    <>
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
        <div className="tournament-banner-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSubmitOpen(true)}
            disabled={players.length === 0}
          >
            Submit a time
          </button>
        </div>
      </section>
      {submitOpen && (
        <SubmitTimeModal
          week={tournament.currentWeek}
          players={players}
          existingTimes={weekTimes}
          onClose={() => setSubmitOpen(false)}
        />
      )}
    </>
  );
}
