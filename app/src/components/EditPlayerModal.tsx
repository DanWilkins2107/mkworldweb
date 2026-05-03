import { useEffect, useState, type FormEvent } from "react";
import { CHARACTERS } from "../characters";
import { updatePlayer, type Player } from "../db/players";
import "./AddPlayerModal.css";

type Props = {
  player: Player;
  onClose: () => void;
};

export function EditPlayerModal({ player, onClose }: Props) {
  const [slackName, setSlackName] = useState(player.slackName);
  const [avatar, setAvatar] = useState<string>(player.avatar);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const trimmedSlack = slackName.trim();
  const slackValid = trimmedSlack.length >= 1 && trimmedSlack.length <= 50;
  const dirty = trimmedSlack !== player.slackName || avatar !== player.avatar;
  const canSubmit = slackValid && dirty && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updatePlayer(player.id, {
        slackName: trimmedSlack,
        avatar,
      });
      onClose();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Failed to save.");
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
        aria-labelledby="edit-player-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">
          <h2 id="edit-player-title">Edit {player.name}</h2>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Slack display name</span>
              <input
                type="text"
                value={slackName}
                onChange={(e) => setSlackName(e.target.value)}
                maxLength={50}
                placeholder="@Joe Bloggs"
                required
                disabled={submitting}
                autoFocus
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
              <button type="submit" className="btn-primary" disabled={!canSubmit}>
                {submitting ? (
                  <span className="spinner" aria-label="Saving" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
