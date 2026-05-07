import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CHARACTERS } from "../characters";
import { usePlayers, type Player } from "../db/players";
import {
  addRecordsPlayer,
  updateRecordsPlayer,
  useRecordsPlayers,
  type RecordsPlayer,
} from "../db/recordsPlayers";
import {
  setPersonalBest,
  usePersonalBests,
} from "../db/personalBests";
import {
  computeMedalTable,
  getBestTimeForTrack,
  getMedalsForTrack,
  type Medal,
  type MedalGroup,
} from "../db/records";
import { formatTime, parseMaskedTime, useTimes } from "../db/times";
import { useTournament } from "../db/tournament";
import { TRACKS, isValidTrackSlug } from "../tracks";
import "./AddPlayerModal.css";
import "./SubmitTimeModal.css";
import "./Records.css";

type CombinedPlayer = {
  id: string;
  name: string;
  avatar: string;
  recordsOnly: boolean;
};

function combinePlayers(
  players: Player[],
  recordsPlayers: RecordsPlayer[],
): CombinedPlayer[] {
  const byId = new Map<string, CombinedPlayer>();
  for (const r of recordsPlayers) {
    byId.set(r.id, {
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      recordsOnly: true,
    });
  }
  for (const p of players) {
    byId.set(p.id, {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      recordsOnly: false,
    });
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

function getRecordsPath(): string {
  return window.location.pathname;
}

function getDetailSlug(): string | null {
  const path = getRecordsPath();
  const parts = path.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "records") return parts[1];
  return null;
}

export function Records() {
  const detailSlug = getDetailSlug();
  if (detailSlug) {
    return <RecordsDetail trackSlug={detailSlug} />;
  }
  return <RecordsList />;
}

function RecordsList() {
  const players = usePlayers();
  const recordsPlayers = useRecordsPlayers();
  const tournament = useTournament();
  const times = useTimes();
  const personalBests = usePersonalBests();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);

  const combined = useMemo(
    () => combinePlayers(players ?? [], recordsPlayers ?? []),
    [players, recordsPlayers],
  );

  const ready =
    players !== null &&
    recordsPlayers !== null &&
    tournament !== null &&
    times !== null &&
    personalBests !== null;

  return (
    <>
      <header className="site-header">
        <h1>Map records</h1>
      </header>

      <section className="records-panel">
        <a href="/" className="admin-back">← Back to leaderboard</a>

        <div className="records-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSubmitOpen(true)}
            disabled={!ready}
          >
            Submit personal best
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setAddPlayerOpen(true)}
          >
            + Add records-only player
          </button>
        </div>

        {!ready ? (
          <div className="leaderboard-status">Loading…</div>
        ) : (
          <>
            <MedalTable combined={combined} tournament={tournament} times={times} personalBests={personalBests} />
            <ul className="records-list">
              {TRACKS.map((track) => {
                const groups = getMedalsForTrack(
                  track.slug,
                  combined.map((p) => p.id),
                  tournament,
                  times,
                  personalBests,
                );
                return (
                  <li key={track.slug} className="records-row">
                    <a
                      href={`/records/${track.slug}`}
                      className="records-row-link"
                    >
                      <img
                        className="leaderboard-track-image"
                        src={`/tracks/${track.slug}.png`}
                        alt={track.displayName}
                      />
                      <span className="records-row-track">
                        {track.displayName}
                      </span>
                      <span className="records-row-medals">
                        {groups.length === 0 ? (
                          <span className="records-row-empty">No times submitted</span>
                        ) : (
                          groups.flatMap((g) =>
                            g.playerIds
                              .map((pid) => combined.find((p) => p.id === pid))
                              .filter((p): p is CombinedPlayer => Boolean(p))
                              .sort((a, b) => a.name.localeCompare(b.name))
                              .map((p) => (
                                <span
                                  key={`${g.medal}-${p.id}`}
                                  className="records-medal-row"
                                >
                                  <span className="records-medal-icon" aria-label={g.medal}>
                                    {medalEmoji(g.medal)}
                                  </span>
                                  <span className="records-medal-name">{p.name}</span>
                                  <span className="records-medal-time">{formatTime(g.ms)}</span>
                                </span>
                              )),
                          )
                        )}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {submitOpen && ready && (
        <SubmitPbModal
          players={combined}
          lockedTrackSlug={null}
          onClose={() => setSubmitOpen(false)}
        />
      )}
      {addPlayerOpen && (
        <AddRecordsPlayerModal onClose={() => setAddPlayerOpen(false)} />
      )}
    </>
  );
}

function RecordsDetail({ trackSlug }: { trackSlug: string }) {
  const players = usePlayers();
  const recordsPlayers = useRecordsPlayers();
  const tournament = useTournament();
  const times = useTimes();
  const personalBests = usePersonalBests();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState<RecordsPlayer | null>(null);

  const combined = useMemo(
    () => combinePlayers(players ?? [], recordsPlayers ?? []),
    [players, recordsPlayers],
  );

  if (!isValidTrackSlug(trackSlug)) {
    return (
      <>
        <header className="site-header">
          <h1>Map records</h1>
        </header>
        <section className="records-panel">
          <a href="/records" className="admin-back">← Back to records</a>
          <div className="leaderboard-empty">
            <p>Track not found.</p>
          </div>
        </section>
      </>
    );
  }

  const track = TRACKS.find((t) => t.slug === trackSlug)!;
  const ready =
    players !== null &&
    recordsPlayers !== null &&
    tournament !== null &&
    times !== null &&
    personalBests !== null;

  const rows = ready
    ? combined
        .map((p) => ({
          player: p,
          ms: getBestTimeForTrack(
            trackSlug,
            p.id,
            tournament,
            times,
            personalBests,
          ),
        }))
        .sort((a, b) => {
          if (a.ms === undefined && b.ms === undefined) {
            return a.player.name.localeCompare(b.player.name);
          }
          if (a.ms === undefined) return 1;
          if (b.ms === undefined) return -1;
          if (a.ms !== b.ms) return a.ms - b.ms;
          return a.player.name.localeCompare(b.player.name);
        })
    : [];

  const medalGroups = ready
    ? getMedalsForTrack(
        trackSlug,
        combined.map((p) => p.id),
        tournament,
        times,
        personalBests,
      )
    : [];

  return (
    <>
      <header className="site-header">
        <h1>Map records</h1>
      </header>

      <section className="records-panel">
        <a href="/records" className="admin-back">← Back to records</a>

        <div className="records-detail-track">
          <img
            className="records-detail-track-image"
            src={`/tracks/${track.slug}.png`}
            alt={track.displayName}
          />
          <h2 className="records-detail-track-name">{track.displayName}</h2>
        </div>

        <div className="records-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setSubmitOpen(true)}
            disabled={!ready}
          >
            Submit your PB for {track.displayName}
          </button>
        </div>

        {!ready ? (
          <div className="leaderboard-status">Loading…</div>
        ) : (
          <ol className="leaderboard">
            {rows.map(({ player, ms }) => {
              const clickable = player.recordsOnly;
              const recordsPlayer = clickable
                ? recordsPlayers!.find((rp) => rp.id === player.id) ?? null
                : null;
              const rankClass = rankClassFromMedals(player.id, medalGroups);
              const position = rankPositionFromMedals(player.id, medalGroups);
              const inner = (
                <>
                  <img
                    className="leaderboard-avatar"
                    src={`/avatars/${player.avatar}.png`}
                    alt={player.avatar}
                    width={48}
                    height={48}
                  />
                  <span className="leaderboard-name">{player.name}</span>
                  <span
                    className={
                      "leaderboard-time" +
                      (ms === undefined ? " leaderboard-time-empty" : "")
                    }
                  >
                    {ms === undefined ? "—" : formatTime(ms)}
                  </span>
                </>
              );
              return (
                <li
                  key={player.id}
                  className={
                    "leaderboard-row" +
                    (rankClass ? ` ${rankClass}` : "") +
                    (ms === undefined ? " leaderboard-row-unranked" : "")
                  }
                >
                  <span
                    className={
                      "leaderboard-rank" +
                      (position === null ? " leaderboard-rank-empty" : "")
                    }
                  >
                    {position ?? "—"}
                  </span>
                  {clickable && recordsPlayer ? (
                    <button
                      type="button"
                      className="leaderboard-player"
                      onClick={() => setEditPlayer(recordsPlayer)}
                      aria-label={`Edit ${player.name}`}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="leaderboard-player records-player-static">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {submitOpen && ready && (
        <SubmitPbModal
          players={combined}
          lockedTrackSlug={trackSlug}
          onClose={() => setSubmitOpen(false)}
        />
      )}
      {editPlayer && (
        <EditRecordsPlayerModal
          player={editPlayer}
          onClose={() => setEditPlayer(null)}
        />
      )}
    </>
  );
}

function medalEmoji(m: Medal): string {
  return m === "gold" ? "🥇" : m === "silver" ? "🥈" : "🥉";
}

function MedalTable({
  combined,
  tournament,
  times,
  personalBests,
}: {
  combined: CombinedPlayer[];
  tournament: import("../db/tournament").Tournament;
  times: import("../db/times").AllTimes;
  personalBests: import("../db/personalBests").PersonalBests;
}) {
  const tally = useMemo(
    () =>
      computeMedalTable(
        TRACKS.map((t) => t.slug),
        combined.map((p) => p.id),
        tournament,
        times,
        personalBests,
      ),
    [combined, tournament, times, personalBests],
  );
  const rows = useMemo(() => {
    const playerById = new Map(combined.map((p) => [p.id, p]));
    return tally
      .map((t) => ({ ...t, player: playerById.get(t.playerId) }))
      .filter((r): r is typeof r & { player: CombinedPlayer } => Boolean(r.player))
      .sort((a, b) => {
        if (a.gold !== b.gold) return b.gold - a.gold;
        if (a.silver !== b.silver) return b.silver - a.silver;
        if (a.bronze !== b.bronze) return b.bronze - a.bronze;
        return a.player.name.localeCompare(b.player.name);
      });
  }, [tally, combined]);

  if (rows.length === 0) return null;

  return (
    <div className="medal-table">
      <h2 className="medal-table-title">Medal table</h2>
      <ol className="medal-table-list">
        {rows.map((row, i) => (
          <li key={row.playerId} className="medal-table-row">
            <span className="medal-table-rank">{i + 1}</span>
            <img
              className="medal-table-avatar"
              src={`/avatars/${row.player.avatar}.png`}
              alt={row.player.avatar}
              width={40}
              height={40}
            />
            <span className="medal-table-name">{row.player.name}</span>
            <span className="medal-table-counts">
              <span className="medal-table-count" title="Gold">🥇 {row.gold}</span>
              <span className="medal-table-count" title="Silver">🥈 {row.silver}</span>
              <span className="medal-table-count" title="Bronze">🥉 {row.bronze}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function rankClassFromMedals(
  playerId: string,
  groups: MedalGroup[],
): string {
  for (const g of groups) {
    if (g.playerIds.includes(playerId)) {
      if (g.medal === "gold") return "rank-1";
      if (g.medal === "silver") return "rank-2";
      return "rank-3";
    }
  }
  return "";
}

function rankPositionFromMedals(
  playerId: string,
  groups: MedalGroup[],
): number | null {
  for (const g of groups) {
    if (g.playerIds.includes(playerId)) {
      if (g.medal === "gold") return 1;
      if (g.medal === "silver") return 2;
      return 3;
    }
  }
  return null;
}

function maskInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 7);
  if (digits.length === 0) return "";
  if (digits.length === 1) return digits;
  const mLen = digits.length >= 7 ? 2 : 1;
  const m = digits.slice(0, mLen);
  const rest = digits.slice(mLen);
  if (rest.length === 0) return m;
  if (rest.length <= 2) return `${m}:${rest}`;
  return `${m}:${rest.slice(0, 2)}.${rest.slice(2)}`;
}

function SubmitPbModal({
  players,
  lockedTrackSlug,
  onClose,
}: {
  players: CombinedPlayer[];
  lockedTrackSlug: string | null;
  onClose: () => void;
}) {
  const [trackSlug, setTrackSlug] = useState<string>(lockedTrackSlug ?? "");
  const [playerId, setPlayerId] = useState<string>("");
  const [timeText, setTimeText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const parsed = useMemo(
    () => (timeText === "" ? null : parseMaskedTime(timeText)),
    [timeText],
  );
  const parseError = touched && parsed && !parsed.ok ? parsed.error : null;

  const canSubmit =
    trackSlug !== "" &&
    playerId !== "" &&
    parsed !== null &&
    parsed.ok &&
    !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !parsed || !parsed.ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await setPersonalBest(trackSlug, playerId, parsed.ms);
      onClose();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Failed to save PB.");
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
        aria-labelledby="submit-pb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">
          <h2 id="submit-pb-title">Submit personal best</h2>
          <p className="records-modal-subtitle">
            Enter your all-time best lap time on this track. Submitting will
            overwrite any previous personal best.
          </p>
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Track</span>
              <select
                value={trackSlug}
                onChange={(e) => setTrackSlug(e.target.value)}
                disabled={submitting || lockedTrackSlug !== null}
                required
                className="submit-time-select"
              >
                <option value="">— Select a track —</option>
                {TRACKS.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Player</span>
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                disabled={submitting}
                required
                className="submit-time-select"
              >
                <option value="">— Select a player —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Best time (M:SS.TTT)</span>
              <input
                type="text"
                inputMode="numeric"
                value={timeText}
                onChange={(e) => {
                  setTimeText(maskInput(e.target.value));
                  setTouched(true);
                }}
                placeholder="0:00.000"
                disabled={submitting}
                className="submit-time-input"
              />
              {parseError && (
                <span className="submit-time-hint">{parseError}</span>
              )}
            </label>

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
                  "Save PB"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddRecordsPlayerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
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
  const canSubmit = nameValid && avatar !== null && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || avatar === null) return;
    setSubmitting(true);
    setError(null);
    try {
      await addRecordsPlayer({ name: trimmedName, avatar });
      onClose();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Failed to add player.");
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
        aria-labelledby="add-records-player-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">
          <h2 id="add-records-player-title">Add records-only player</h2>
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
                        "avatar-tile" +
                        (selected ? " avatar-tile-selected" : "")
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
    </div>
  );
}

function EditRecordsPlayerModal({
  player,
  onClose,
}: {
  player: RecordsPlayer;
  onClose: () => void;
}) {
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

  const dirty = avatar !== player.avatar;
  const canSubmit = dirty && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await updateRecordsPlayer(player.id, { avatar });
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
        aria-labelledby="edit-records-player-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body">
          <h2 id="edit-records-player-title">Edit {player.name}</h2>
          <form onSubmit={handleSubmit}>
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
                        "avatar-tile" +
                        (selected ? " avatar-tile-selected" : "")
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
