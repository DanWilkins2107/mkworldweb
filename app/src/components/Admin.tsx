import { useState } from "react";
import { clearAllPlayers } from "../db/players";
import {
  advanceWeek,
  finishTournament,
  pickNextWeekTrack,
  resetTournament,
  startTournament,
  useTournament,
} from "../db/tournament";
import { TRACKS } from "../tracks";
import { AdminSlackMessages } from "./AdminSlackMessages";
import "./Admin.css";

export function Admin() {
  const tournament = useTournament();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tournamentBusy, setTournamentBusy] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  async function runTournamentAction(action: () => Promise<void>) {
    setTournamentBusy(true);
    setTournamentError(null);
    try {
      await action();
    } catch (err) {
      setTournamentError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setTournamentBusy(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      await Promise.all([clearAllPlayers(), resetTournament()]);
      setConfirmOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset.";
      setError(message);
    } finally {
      setResetting(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setFinishError(null);
    try {
      await finishTournament();
      setFinishOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to finish tournament.";
      setFinishError(message);
    } finally {
      setFinishing(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <h1>Admin</h1>
      </header>

      <section className="admin-panel">
        <a href="/" className="admin-back">← Back to leaderboard</a>

        <div className="admin-card">
          <h2>Tournament</h2>
          {tournament === null && <p>Loading…</p>}

          {tournament !== null && tournament.status === "not-started" && (
            <>
              <p>The tournament hasn't started yet. Week 1's track will be picked at random.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => runTournamentAction(startTournament)}
                disabled={tournamentBusy}
              >
                {tournamentBusy ? <span className="spinner" /> : "Start tournament"}
              </button>
            </>
          )}

          {tournament !== null &&
            tournament.status === "in-progress" &&
            tournament.currentWeek < 30 &&
            (() => {
              const next = tournament.currentWeek + 1;
              const nextWeek = tournament.weeks[String(next)];
              const nextTrack = nextWeek
                ? TRACKS.find((t) => t.slug === nextWeek.trackSlug)
                : null;
              return (
                <>
                  <p>Currently on week {tournament.currentWeek} of 30.</p>
                  {nextTrack ? (
                    <>
                      <p>Week {next}'s track is set: <strong>{nextTrack.displayName}</strong>.</p>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => runTournamentAction(advanceWeek)}
                        disabled={tournamentBusy}
                      >
                        {tournamentBusy ? <span className="spinner" /> : `Advance to week ${next}`}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => runTournamentAction(pickNextWeekTrack)}
                      disabled={tournamentBusy}
                    >
                      {tournamentBusy ? <span className="spinner" /> : `Pick week ${next}'s track`}
                    </button>
                  )}
                </>
              );
            })()}

          {tournament !== null &&
            tournament.status === "in-progress" &&
            tournament.currentWeek === 30 && (
              <>
                <p>Week 30 of 30 — final week. Ready to finish?</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFinishOpen(true)}
                >
                  Finish tournament
                </button>
              </>
            )}

          {tournament !== null && tournament.status === "finished" && (
            <p>Tournament complete.</p>
          )}

          {tournamentError && <div className="form-error">{tournamentError}</div>}
        </div>

        <AdminSlackMessages />

        <div className="admin-card admin-card-spaced">
          <h2>Reset tournament</h2>
          <p>Wipes the tournament and every player. Starts everything from scratch. This cannot be undone.</p>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setConfirmOpen(true)}
          >
            Reset
          </button>
        </div>
      </section>

      {finishOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!finishing) setFinishOpen(false);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finish-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body">
              <h2 id="finish-confirm-title">Finish tournament?</h2>
              <p>This marks the tournament complete. You can't undo it from here.</p>
              {finishError && <div className="form-error">{finishError}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setFinishOpen(false)}
                  disabled={finishing}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleFinish}
                  disabled={finishing}
                >
                  {finishing ? (
                    <span className="spinner" aria-label="Finishing" />
                  ) : (
                    "Yes, finish"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!resetting) setConfirmOpen(false);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body">
              <h2 id="reset-confirm-title">Reset everything?</h2>
              <p>
                This will permanently delete the tournament and every player. There's no undo.
              </p>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirmOpen(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleReset}
                  disabled={resetting}
                >
                  {resetting ? <span className="spinner" aria-label="Resetting" /> : "Yes, reset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
