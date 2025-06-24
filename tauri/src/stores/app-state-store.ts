import { LazyStore } from "@tauri-apps/plugin-store";
import { create } from "zustand";

type AppState = {
  graphName: string | null;
  openGraph: (graphName: string) => void;
  closeGraph: () => void;
};

export const useAppState = create<AppState>((set) => ({
  graphName: null,
  openGraph: (graphName) => {
    if (graphName.length > 0) set({ graphName });
  },
  closeGraph: () => {
    set({ graphName: null });
  },
}));

export async function initAppStateStore(stateStorage: LazyStore) {
  const prev = await stateStorage.get("appState");

  if (
    typeof prev === "object" &&
    prev !== null &&
    "graphName" in prev &&
    typeof prev.graphName === "string"
  ) {
    useAppState.getState().openGraph(prev.graphName);
  }

  useAppState.subscribe((state) => {
    stateStorage.set("appState", state);
  });
}
