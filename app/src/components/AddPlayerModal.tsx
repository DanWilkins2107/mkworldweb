import { useEffect, useState, type FormEvent } from "react";
import { CHARACTERS } from "../characters";
import { addPlayer } from "../db/players";

type Props = {
  onClose: () => void;
};

export function AddPlayerModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [slackName, setSlackName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const trimmedName = name.trim();
  const nameValid = trimmedName.length >= 1 && trimmedName.length <= 50;
  const slackValid = slackName.length <= 50;
  const canSubmit = nameValid && slackValid && avatar !== null && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || avatar === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await addPlayer({
        name: trimmedName,
        slackName: slackName.trim() === "" ? null : slackName.trim(),
        avatar,
      });
      onClose();
    } catch (err) {
      setSubmitting(false);
      const message =
        err instanceof Error ? err.message : "Failed to add player.";
      setError(message);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-player-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-player-title">Add Player</h2>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              disabled={submitting}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Slack display name (optional)</span>
            <input
              type="text"
              value={slackName}
              onChange={(e) => setSlackName(e.target.value)}
              maxLength={50}
              disabled={submitting}
            />
          </label>
          <fieldset className="field avatar-field" disabled={submitting}>
            <legend>Avatar</legend>
            <div className="avatar-grid">
              {CHARACTERS.map((c) => {
                const selected = avatar === c.slug;
                return (
                  <button
                    type="button"
                    key={c.slug}
                    className={
                      "avatar-tile" + (selected ? " avatar-tile-selected" : "")
                    }
                    onClick={() => setAvatar(c.slug)}
                    aria-pressed={selected}
                  >
                    <img
                      src={`/avatars/${c.slug}.png`}
                      alt={c.displayName}
                      width={64}
                      height={64}
                    />
                    <span>{c.displayName}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
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
                "Add Player"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
