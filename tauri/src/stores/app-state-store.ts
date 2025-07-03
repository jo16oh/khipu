import { LazyStore } from "@tauri-apps/plugin-store";
import { memoize } from "es-toolkit";
import { commands } from "generated/tauri-commands";
import { createContext, use } from "react";
import { createStore, StoreApi, useStore } from "zustand";

type AppState = {
  graphName: string | null;
  openGraph: (graphName: string) => void;
  closeGraph: () => void;
};

export type AppStateStore = StoreApi<AppState>;

export const AppStateStoreContext = createContext<AppStateStore | null>(null);

export function useAppState<U>(selector: (state: AppState) => U) {
  const store = use(AppStateStoreContext);
  if (!store) throw new Error("AppStateStoreContext is not set");
  return useStore(store, selector);
}

export const createAppStateStore = memoize(async (stateStorage: LazyStore) => {
  const store = createStore<AppState>((set) => ({
    graphName: null,
    openGraph: (graphName) => {
      if (graphName.length > 0) set({ graphName });
    },
    closeGraph: () => {
      set({ graphName: null });
    },
  }));

  const prev = await stateStorage.get("appState");

  if (
    typeof prev === "object" &&
    prev !== null &&
    "graphName" in prev &&
    typeof prev.graphName === "string"
  ) {
    store.getState().openGraph(prev.graphName);
    await commands.openGraph(prev.graphName);
  }

  store.subscribe((state, prevState) => {
    stateStorage.set("appState", state);

    if (state.graphName !== prevState.graphName) {
      if (state.graphName) {
        commands.openGraph(state.graphName).catch((e) => {
          console.error(e);
          store.getState().closeGraph();
        });
      } else {
        commands.closeGraph();
      }
    }
  });

  return store;
});
