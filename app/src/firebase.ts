import { initializeApp } from "firebase/app";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const database = getDatabase(app);

if (import.meta.env.VITE_USE_EMULATOR === "true") {
  const host = import.meta.env.VITE_EMULATOR_HOST ?? "127.0.0.1";
  const port = Number(import.meta.env.VITE_EMULATOR_DB_PORT ?? "9000");
  connectDatabaseEmulator(database, host, port);
}
