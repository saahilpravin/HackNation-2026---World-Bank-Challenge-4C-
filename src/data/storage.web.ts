import type { Data } from "./types";
const key = "lauda-state-v1";
const legacyKey = "noor-state-v1";
export async function load(): Promise<Data | null> {
  const raw = localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
  if (!raw) return null;
  const data: Data = JSON.parse(raw);
  // Copy legacy data only after successfully decoding it; leave the old copy intact.
  if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  return data;
}
export async function save(data: Data) {
  localStorage.setItem(key, JSON.stringify(data));
}
