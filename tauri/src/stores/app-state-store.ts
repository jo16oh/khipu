import { commands } from "generated/tauri-commands";
import { create } from "zustand";
import { StateStorage } from "./state-storage";

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

export async function initAppStateStore() {
  const prev = await StateStorage.get("appState");

  if (
    typeof prev === "object" &&
    prev !== null &&
    "graphName" in prev &&
    typeof prev.graphName === "string"
  ) {
    useAppState.getState().openGraph(prev.graphName);
    await commands.openGraph(prev.graphName);
  }

  useAppState.subscribe((state) => {
    StateStorage.set("appState", state);
  });
}
