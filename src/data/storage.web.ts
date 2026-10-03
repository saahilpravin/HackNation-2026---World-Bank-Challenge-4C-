import type { Data } from "./types";
// Browser preview only; native builds use SQLite. No silent memory fallback.
const key = "noor-state-v1";
export async function load(): Promise<Data | null> {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}
export async function save(data: Data) {
  localStorage.setItem(key, JSON.stringify(data));
}
