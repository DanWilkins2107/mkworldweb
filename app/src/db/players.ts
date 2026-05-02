import { onValue, push, ref, set } from "firebase/database";
import { database } from "../firebase";

export type Player = {
  id: string;
  name: string;
  slackName: string | null;
  avatar: string;
};

export type NewPlayer = {
  name: string;
  slackName: string | null;
  avatar: string;
};

const PLAYERS_PATH = "players";

export function subscribeToPlayers(
  callback: (players: Player[]) => void,
): () => void {
  const playersRef = ref(database, PLAYERS_PATH);
  const unsubscribe = onValue(playersRef, (snapshot) => {
    const value = snapshot.val() as Record<
      string,
      { name: string; slackName: string | null; avatar: string }
    > | null;
    if (!value) {
      callback([]);
      return;
    }
    const players: Player[] = Object.entries(value)
      .map(([id, v]) => ({
        id,
        name: v.name,
        slackName: v.slackName ?? null,
        avatar: v.avatar,
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    callback(players);
  });
  return unsubscribe;
}

export async function addPlayer(player: NewPlayer): Promise<void> {
  const playersRef = ref(database, PLAYERS_PATH);
  const newRef = push(playersRef);
  await set(newRef, {
    name: player.name,
    slackName: player.slackName,
    avatar: player.avatar,
  });
}
