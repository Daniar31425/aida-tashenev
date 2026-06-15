import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ActivityKind = "info" | "success" | "processing" | "error";
export interface ActivityEntry {
  id: string;
  time: string;
  kind: ActivityKind;
  text: string;
}

interface Ctx {
  entries: ActivityEntry[];
  log: (kind: ActivityKind, text: string) => void;
  clear: () => void;
}

const ActivityCtx = createContext<Ctx | null>(null);
const KEY = "aida_activity_log";

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(entries.slice(0, 100))); } catch {}
  }, [entries]);

  const log = (kind: ActivityKind, text: string) => {
    const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setEntries((p) => [{ id: Math.random().toString(36).slice(2), time, kind, text }, ...p].slice(0, 100));
  };
  const clear = () => setEntries([]);

  return <ActivityCtx.Provider value={{ entries, log, clear }}>{children}</ActivityCtx.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityCtx);
  if (!ctx) throw new Error("useActivity outside provider");
  return ctx;
}
