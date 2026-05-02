import { useState } from "react";
import { AddPlayerModal } from "./components/AddPlayerModal";
import { Leaderboard } from "./components/Leaderboard";
import "./App.css";

function App() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <h1>SoftKartMarioWire</h1>
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
        <Leaderboard />
      </section>

      {modalOpen && <AddPlayerModal onClose={() => setModalOpen(false)} />}
    </>
  );
}

export default App;
