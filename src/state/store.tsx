import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { load, save } from "../data/storage";
import { emptyData } from "../data/profile";
import type { Data } from "../data/types";
type Store = {
  data: Data | null;
  error: string | null;
  update: (fn: (d: Data) => Data) => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<Data | null>(null);
  const queue = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await load();
        const initial = saved ?? emptyData();
        if (!saved) await save(initial);
        if (alive) {
          current.current = initial;
          setData(initial);
        }
      } catch (e) {
        if (alive) setError(String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const update = (fn: (d: Data) => Data) => {
    const task = queue.current.then(async () => {
      if (!current.current) throw new Error("Storage is not ready.");
      const next = fn(current.current);
      await save(next);
      current.current = next;
      setData(next);
    });
    queue.current = task.catch(() => {});
    return task;
  };
  return (
    <Context.Provider value={{ data, error, update }}>
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing store");
  return value;
}
