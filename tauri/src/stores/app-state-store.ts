import { LazyStore } from "@tauri-apps/plugin-store";
import { create } from "zustand";

type AppState = {
  dbName: string | null;
  openDb: (dbName: string) => void;
  closeDb: () => void;
};

export const useAppState = create<AppState>((set) => ({
  dbName: null,
  openDb: (dbName) => {
    if (dbName.length > 0) set({ dbName });
  },
  closeDb: () => {
    set({ dbName: null });
  },
}));

export async function initAppStateStore(stateStorage: LazyStore) {
  const prev = await stateStorage.get("appState");

  if (
    typeof prev === "object" &&
    prev !== null &&
    "dbName" in prev &&
    typeof prev.dbName === "string"
  ) {
    useAppState.getState().openDb(prev.dbName);
  }

  useAppState.subscribe((state) => {
    stateStorage.set("appState", state);
  });
}
