export function colorForRank(rank: number): string {
  if (rank === 1) return "#ffd34d"; // gold
  if (rank === 2) return "#cdd3da"; // silver
  if (rank === 3) return "#e08a3c"; // bronze
  return "#8fb7e8"; // default blue
}
