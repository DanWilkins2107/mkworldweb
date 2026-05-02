import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  deleteTime,
  formatTime,
  parseMaskedTime,
  setTime,
  type WeekTimes,
} from "../db/times";
import type { Player } from "../db/players";
import "./SubmitTimeModal.css";

type Props = {
  week: number;
  players: Player[];
  existingTimes: WeekTimes;
  onClose: () => void;
  initialPlayerId?: string;
};

function maskInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 7);
  if (digits.length === 0) return "";
  if (digits.length === 1) return digits;
  // Always lead with minutes: 1 digit unless we hit the max of 7 digits (e.g. "30:00.000").
  const mLen = digits.length >= 7 ? 2 : 1;
  const m = digits.slice(0, mLen);
  const rest = digits.slice(mLen);
  if (rest.length === 0) return m;
  if (rest.length <= 2) return `${m}:${rest}`;
  return `${m}:${rest.slice(0, 2)}.${rest.slice(2)}`;
}

export function SubmitTimeModal({
  week,
  players,
  existingTimes,
  onClose,
  initialPlayerId,
}: Props) {
  const [playerId, setPlayerId] = useState<string>(initialPlayerId ?? "");
  const [timeText, setTimeText] = useState<string>(() =>
    initialPlayerId && existingTimes[initialPlayerId] !== undefined
      ? formatTime(existingTimes[initialPlayerId])
      : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const busy = submitting || deleting;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const hasExisting =
    playerId !== "" && existingTimes[playerId] !== undefined;

  function handlePlayerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setPlayerId(id);
    setError(null);
    setTouched(false);
    if (id && existingTimes[id] !== undefined) {
      setTimeText(formatTime(existingTimes[id]));
    } else {
      setTimeText("");
    }
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTimeText(maskInput(e.target.value));
    setTouched(true);
  }

  const parsed = useMemo(
    () => (timeText === "" ? null : parseMaskedTime(timeText)),
    [timeText],
  );
  const parseError = touched && parsed && !parsed.ok ? parsed.error : null;

  const canSubmit =
    playerId !== "" && parsed !== null && parsed.ok && !busy;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !parsed || !parsed.ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await setTime(week, playerId, parsed.ms);
      onClose();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Failed to save time.");
    }
  }

  async function handleDelete() {
    if (!hasExisting || busy) return;
    if (!window.confirm("Delete this player's time for this week?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteTime(week, playerId);
      onClose();
    } catch (err) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Failed to delete time.");
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-time-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">
          <h2 id="submit-time-title">Submit Time — Week {week}</h2>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Player</span>
              <select
                value={playerId}
                onChange={handlePlayerChange}
                disabled={busy}
                required
                autoFocus
                className="submit-time-select"
              >
                <option value="">— Select a player —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {existingTimes[p.id] !== undefined ? " ✓" : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Time (M:SS.TTT)</span>
              <input
                type="text"
                inputMode="numeric"
                value={timeText}
                onChange={handleTimeChange}
                placeholder="0:00.000"
                disabled={busy}
                className="submit-time-input"
              />
              {parseError && (
                <span className="submit-time-hint">{parseError}</span>
              )}
            </label>

            {error && <div className="form-error">{error}</div>}

            <div className="modal-actions submit-time-actions">
              {hasExisting && (
                <button
                  type="button"
                  className="btn-secondary submit-time-delete"
                  onClick={handleDelete}
                  disabled={busy}
                >
                  {deleting ? (
                    <span className="spinner" aria-label="Deleting" />
                  ) : (
                    "Delete time"
                  )}
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={!canSubmit}>
                {submitting ? (
                  <span className="spinner" aria-label="Saving" />
                ) : hasExisting ? (
                  "Update Time"
                ) : (
                  "Save Time"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
