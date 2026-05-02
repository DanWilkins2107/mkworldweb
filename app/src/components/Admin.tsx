import { useState } from "react";
import { clearAllPlayers } from "../db/players";
import "./Admin.css";

export function Admin() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <header className="site-header">
        <h1>Admin</h1>
      </header>

      <section className="admin-panel">
        <a href="/" className="admin-back">← Back to leaderboard</a>
        <div className="admin-card">
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
