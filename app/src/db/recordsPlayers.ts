import { onValue, push, ref, set, update } from "firebase/database";
import { useEffect, useState } from "react";
import { database } from "../firebase";

export type RecordsPlayer = {
  id: string;
  name: string;
  avatar: string;
};

export type NewRecordsPlayer = {
  name: string;
  avatar: string;
};

const RECORDS_PLAYERS_PATH = "recordsPlayers";

export function subscribeToRecordsPlayers(
  callback: (players: RecordsPlayer[]) => void,
): () => void {
  const playersRef = ref(database, RECORDS_PLAYERS_PATH);
  const unsubscribe = onValue(playersRef, (snapshot) => {
    const value = snapshot.val() as Record<
      string,
      { name: string; avatar: string }
    > | null;
    if (!value) {
      callback([]);
      return;
    }
    const players: RecordsPlayer[] = Object.entries(value)
      .map(([id, v]) => ({
        id,
        name: v.name,
        avatar: v.avatar,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    callback(players);
  });
  return unsubscribe;
}

export function useRecordsPlayers(): RecordsPlayer[] | null {
  const [players, setPlayers] = useState<RecordsPlayer[] | null>(null);
  useEffect(() => {
    const unsubscribe = subscribeToRecordsPlayers(setPlayers);
    return unsubscribe;
  }, []);
  return players;
}

export async function addRecordsPlayer(
  player: NewRecordsPlayer,
): Promise<void> {
  const playersRef = ref(database, RECORDS_PLAYERS_PATH);
  const newRef = push(playersRef);
  await set(newRef, {
    name: player.name,
    avatar: player.avatar,
  });
}

export async function updateRecordsPlayer(
  id: string,
  fields: Partial<Pick<RecordsPlayer, "avatar">>,
): Promise<void> {
  await update(ref(database, `${RECORDS_PLAYERS_PATH}/${id}`), fields);
}
