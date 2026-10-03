import { openDatabaseAsync } from "expo-sqlite";
import type { Data } from "./types";
// Keep the original filename so existing device data survives the Lauda rebrand.
const database = openDatabaseAsync("noor.db");
export async function load(): Promise<Data | null> {
  const db = await database;
  await db.execAsync(
    "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, json TEXT NOT NULL);",
  );
  const row = await db.getFirstAsync<{ json: string }>(
    "SELECT json FROM app_state WHERE id = 1",
  );
  return row ? JSON.parse(row.json) : null;
}
export async function save(data: Data) {
  const db = await database;
  await db.runAsync(
    "INSERT INTO app_state (id,version,json) VALUES (1,1,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
    JSON.stringify(data),
  );
}
