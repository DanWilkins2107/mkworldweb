import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Player } from "../db/players";
import {
  computeWeekRanking,
  type AllTimes,
} from "../db/times";
import "./StandingsChart.css";

type View = "points" | "positions";

const COLORS = [
  "#e60012",
  "#43b047",
  "#0066cc",
  "#ffa500",
  "#9933cc",
  "#00aaaa",
  "#cc0066",
  "#7a5230",
  "#0d1b2a",
  "#888888",
  "#5cb85c",
  "#ff6b6b",
];

type Props = {
  players: Player[];
  times: AllTimes;
  throughWeek: number;
};

export function StandingsChart({ players, times, throughWeek }: Props) {
  const [view, setView] = useState<View>("points");

  const validIds = useMemo(() => new Set(players.map((p) => p.id)), [players]);

  const weeks = useMemo(() => {
    const out: number[] = [];
    for (let w = 1; w <= throughWeek; w++) out.push(w);
    return out;
  }, [throughWeek]);

  const data = useMemo(() => {
    if (weeks.length === 0) return [];
    const rows: Record<string, number | string>[] = [];

    if (view === "points") {
      // Baseline at week 0 — everyone starts on zero
      const baseline: Record<string, number | string> = { week: "Start" };
      for (const p of players) baseline[p.name] = 0;
      rows.push(baseline);

      const cumulative = new Map<string, number>();
      for (const p of players) cumulative.set(p.id, 0);

      for (const w of weeks) {
        const ranking = computeWeekRanking(times[String(w)] ?? {}, validIds);
        for (const r of ranking) {
          cumulative.set(r.playerId, (cumulative.get(r.playerId) ?? 0) + r.points);
        }
        const row: Record<string, number | string> = { week: `W${w}` };
        for (const p of players) {
          row[p.name] = cumulative.get(p.id) ?? 0;
        }
        rows.push(row);
      }
    } else {
      const cumulative = new Map<string, number>();
      for (const p of players) cumulative.set(p.id, 0);

      for (const w of weeks) {
        const ranking = computeWeekRanking(times[String(w)] ?? {}, validIds);
        for (const r of ranking) {
          cumulative.set(r.playerId, (cumulative.get(r.playerId) ?? 0) + r.points);
        }

        const sorted = [...players].sort((a, b) => {
          const diff = (cumulative.get(b.id) ?? 0) - (cumulative.get(a.id) ?? 0);
          if (diff !== 0) return diff;
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });

        const positionById = new Map<string, number>();
        let lastPts: number | null = null;
        let lastPos = 0;
        sorted.forEach((p, i) => {
          const pts = cumulative.get(p.id) ?? 0;
          const pos = lastPts !== null && pts === lastPts ? lastPos : i + 1;
          positionById.set(p.id, pos);
          lastPts = pts;
          lastPos = pos;
        });

        const row: Record<string, number | string> = { week: `W${w}` };
        for (const p of players) {
          row[p.name] = positionById.get(p.id) ?? players.length;
        }
        rows.push(row);
      }
    }
    return rows;
  }, [weeks, times, players, validIds, view]);

  if (weeks.length === 0) {
    return (
      <div className="standings-chart">
        <h3>Progression</h3>
        <p className="standings-chart-empty">
          The chart appears once at least one week is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="standings-chart">
      <div className="standings-chart-header">
        <h3>Progression</h3>
        <div className="standings-chart-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={view === "points"}
            className={
              "standings-chart-tab" +
              (view === "points" ? " standings-chart-tab-active" : "")
            }
            onClick={() => setView("points")}
          >
            Points
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "positions"}
            className={
              "standings-chart-tab" +
              (view === "positions" ? " standings-chart-tab-active" : "")
            }
            onClick={() => setView("positions")}
          >
            Positions
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(13,27,42,0.15)" />
          <XAxis dataKey="week" stroke="#0d1b2a" />
          <YAxis
            stroke="#0d1b2a"
            reversed={view === "positions"}
            allowDecimals={false}
            domain={view === "positions" ? [1, players.length] : [0, "auto"]}
          />
          <Tooltip />
          <Legend />
          {players.map((p, i) => (
            <Line
              key={p.id}
              type="linear"
              dataKey={p.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
