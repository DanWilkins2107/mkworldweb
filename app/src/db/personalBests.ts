import { ref, set } from "firebase/database";
import { database } from "../firebase";

const PERSONAL_BESTS_PATH = "/personalBests";

export async function clearAllPersonalBests(): Promise<void> {
  await set(ref(database, PERSONAL_BESTS_PATH), null);
}
