import { useState } from "react";
import { clearAllPlayers } from "../db/players";
import {
  advanceWeek,
  finishTournament,
  startTournament,
  useTournament,
  usedTrackSlugs,
} from "../db/tournament";
import { TrackPickerModal } from "./TrackPickerModal";
import "./Admin.css";

type PickerMode = "start" | "advance" | null;

export function Admin() {
  const tournament = useTournament();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      await clearAllPlayers();
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
              <p>The tournament hasn't started yet. Pick week 1's track to begin.</p>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPickerMode("start")}
              >
                Start tournament
              </button>
            </>
          )}

          {tournament !== null &&
            tournament.status === "in-progress" &&
            tournament.currentWeek < 30 && (
              <>
                <p>Currently on week {tournament.currentWeek} of 30.</p>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPickerMode("advance")}
                >
                  Advance to next week
                </button>
              </>
            )}

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
        </div>

        <div className="admin-card admin-card-spaced">
          <h2>Reset all players</h2>
          <p>Wipes every player from the leaderboard. This cannot be undone.</p>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setConfirmOpen(true)}
          >
            Reset
          </button>
        </div>
      </section>

      {pickerMode === "start" && tournament !== null && (
        <TrackPickerModal
          title="Pick week 1's track"
          excludeSlugs={new Set()}
          submitLabel="Start tournament"
          onConfirm={async (slug) => {
            await startTournament(slug);
            setPickerMode(null);
          }}
          onCancel={() => setPickerMode(null)}
        />
      )}

      {pickerMode === "advance" && tournament !== null && (
        <TrackPickerModal
          title={`Pick week ${tournament.currentWeek + 1}'s track`}
          excludeSlugs={usedTrackSlugs(tournament)}
          submitLabel={`Advance to week ${tournament.currentWeek + 1}`}
          onConfirm={async (slug) => {
            await advanceWeek(slug);
            setPickerMode(null);
          }}
          onCancel={() => setPickerMode(null)}
        />
      )}

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
              <h2 id="reset-confirm-title">Are you sure?</h2>
              <p>
                This will permanently delete every player. There's no undo.
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
