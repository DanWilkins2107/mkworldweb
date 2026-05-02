import { useState } from "react";
import { AddPlayerModal } from "./components/AddPlayerModal";
import { Leaderboard } from "./components/Leaderboard";
import { Admin } from "./components/Admin";
import "./App.css";
import "./components/Admin.css";

function App() {
  const [modalOpen, setModalOpen] = useState(false);

  if (window.location.pathname.startsWith("/admin")) {
    return <Admin />;
  }

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

      <a href="/admin" className="admin-link">Admin</a>
    </>
  );
}

export default App;
