import { create } from "zustand";

type AppState = {
  dbName: string | null;
  openDb: (dbName: string) => void;
  closeDb: () => void;
};

export const useAppState = (() => {
  const store = create<AppState>((set) => ({
    dbName: null,
    openDb: (dbName) => {
      if (dbName.length > 0) set({ dbName });
    },
    closeDb: () => {
      set({ dbName: null });
    },
  }));

  if (typeof localStorage !== "undefined") {
    const prev = JSON.parse(localStorage.getItem("appState") ?? "{}") as unknown;

    if (
      typeof prev === "object" &&
      prev !== null &&
      "dbName" in prev &&
      typeof prev.dbName === "string"
    ) {
      store.getState().openDb(prev.dbName);
    }

    store.subscribe((state) => {
      localStorage.setItem("appState", JSON.stringify(state));
    });
  }

  return store;
})();
