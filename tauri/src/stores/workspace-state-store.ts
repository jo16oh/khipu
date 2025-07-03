import { LazyStore } from "@tauri-apps/plugin-store";
import { createContext, use } from "react";
import { createStore, StoreApi, useStore } from "zustand";
import { StateStorage } from "./state-storage";
import { createViewStateStore, ViewStateStore } from "./view-state-store";

export type TabKind = "timeline" | "search" | "stage";

type WorkspaceState = {
  stage: ViewStateStore;
  hover: ViewStateStore | null;
  focus: TabKind;
  switchTab: (to: TabKind) => void;
  openHover: (view: ViewStateStore) => void;
  closeHover: () => void;
};

export type WorkspaceStateStore = StoreApi<WorkspaceState>;

export const WorkspaceStateStoreContext = createContext<WorkspaceStateStore | null>(null);

export function useWorkspaceState<U>(selector: (state: WorkspaceState) => U) {
  const store = use(WorkspaceStateStoreContext);
  if (!store) throw new Error("WorkspaceStateStoreContext is not set");
  return useStore(store, selector);
}

export async function renameSavedWorkspaceState(prevGraphName: string, currentGraphName: string) {
  const prev = await StateStorage.get("stageView" + prevGraphName);
  await StateStorage.set("stageView" + currentGraphName, prev);
  await StateStorage.delete("stageView" + prevGraphName);
}

export async function createWorkspaceStateStore({
  graphName,
  stateStorage,
}: {
  graphName: string;
  stateStorage?: LazyStore;
}) {
  const mainViewStateStore = createViewStateStore();

  if (stateStorage) {
    const initialState = await stateStorage.get("stageView" + graphName);

    if (
      initialState !== null &&
      typeof initialState === "object" &&
      "id" in initialState &&
      typeof initialState?.id === "string"
    ) {
      mainViewStateStore.setState({ id: initialState.id });
    }

    mainViewStateStore.subscribe((current) => {
      const state = { id: current.id };
      stateStorage.set("stageView" + graphName, state);
    });
  }

  return createStore<WorkspaceState>((set) => ({
    stage: mainViewStateStore,
    hover: null,
    focus: "stage",
    switchTab: (to: TabKind) => {
      set(() => ({ focus: to }));
    },
    openHover: (view: ViewStateStore) => {
      set(() => ({ hover: view }));
    },
    closeHover: () => {
      set(() => ({ hover: null }));
    },
  }));
}
