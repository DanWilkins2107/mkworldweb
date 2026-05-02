import { useEffect, useState, type FormEvent } from "react";
import { TRACKS } from "../tracks";
import "./TrackPickerModal.css";

type Props = {
  title: string;
  excludeSlugs: Set<string>;
  submitLabel: string;
  onConfirm: (trackSlug: string) => Promise<void>;
  onCancel: () => void;
};

export function TrackPickerModal({
  title,
  excludeSlugs,
  submitLabel,
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, submitting]);

  const available = TRACKS.filter((t) => !excludeSlugs.has(t.slug));
  const canSubmit = selected !== null && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || selected === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(selected);
    } catch (err) {
      setSubmitting(false);
      const message =
        err instanceof Error ? err.message : "Failed to save track.";
      setError(message);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!submitting) onCancel();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="track-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">
          <h2 id="track-picker-title">{title}</h2>
          <form onSubmit={handleSubmit}>
            <fieldset className="field track-field" disabled={submitting}>
              <legend>Track</legend>
              <div className="track-grid">
                {available.map((t) => {
                  const isSelected = selected === t.slug;
                  return (
                    <button
                      type="button"
                      key={t.slug}
                      className={
                        "track-tile" +
                        (isSelected ? " track-tile-selected" : "")
                      }
                      onClick={() => setSelected(t.slug)}
                      aria-pressed={isSelected}
                    >
                      <img
                        src={`/tracks/${t.slug}.png`}
                        alt={t.displayName}
                        width={120}
                        height={68}
                      />
                      <span>{t.displayName}</span>
                    </button>
                  );
                })}
                {available.length === 0 && (
                  <p className="track-empty">No tracks remaining.</p>
                )}
              </div>
            </fieldset>

            {error && <div className="form-error">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={!canSubmit}
              >
                {submitting ? (
                  <span className="spinner" aria-label="Saving" />
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
