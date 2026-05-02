import { useState } from "react";
import { AddPlayerModal } from "./components/AddPlayerModal";
import { Leaderboard } from "./components/Leaderboard";
import "./App.css";

function App() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <h1>MkworldWeb</h1>
        <p className="tagline">Mario Kart World leaderboard</p>
      </header>

      <section className="actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setModalOpen(true)}
        >
          + Add Player
        </button>
      </section>

      <section className="leaderboard-section">
        <h2>Leaderboard</h2>
        <Leaderboard />
      </section>

      {modalOpen && <AddPlayerModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

export default App;
