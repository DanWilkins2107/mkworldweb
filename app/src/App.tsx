import { useState } from "react";
import { AddPlayerModal } from "./components/AddPlayerModal";
import { Leaderboard } from "./components/Leaderboard";
import { Admin } from "./components/Admin";
import { Records } from "./components/Records";
import { TournamentBanner } from "./components/TournamentBanner";
import { useTournament } from "./db/tournament";
import { RULES } from "./rules";
import "./App.css";
import "./components/Admin.css";
import "./components/Records.css";

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const tournament = useTournament();

  if (window.location.pathname.startsWith("/admin")) {
    return <Admin />;
  }

  if (window.location.pathname.startsWith("/records")) {
    return <Records />;
  }

  const showAddPlayerButton =
    tournament !== null && tournament.status !== "not-started";

  return (
    <>
      <header className="site-header">
        <h1>SoftKartMarioWire</h1>
      </header>

      <TournamentBanner />

      {showAddPlayerButton && (
        <section className="actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => setModalOpen(true)}
          >
            + Add Player
          </button>
        </section>
      )}

      <section className="leaderboard-section">
        <Leaderboard />
      </section>

      <section className="rules-section">
        <details className="rules">
          <summary>Rules</summary>
          <div className="rules-body">
            {RULES.map((section) => (
              <div key={section.heading} className="rules-group">
                <h3>{section.heading}</h3>
                <ul>
                  {section.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      </section>

      {modalOpen && <AddPlayerModal onClose={() => setModalOpen(false)} />}

      <a href="/records" className="records-link">Map records</a>
      <a href="/admin" className="admin-link">Admin</a>
    </>
  );
}

export default App;
