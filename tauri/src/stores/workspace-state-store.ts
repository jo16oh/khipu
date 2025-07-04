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
  const stageViewState = createViewStateStore();

  const workspaceStateStore = createStore<WorkspaceState>((set) => ({
    stage: stageViewState,
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

  if (stateStorage) {
    const prevStageViewState = await stateStorage.get(`stageView|${graphName}`);

    if (
      prevStageViewState !== null &&
      typeof prevStageViewState === "object" &&
      "id" in prevStageViewState &&
      typeof prevStageViewState?.id === "string"
    ) {
      stageViewState.setState({ id: prevStageViewState.id });
    }

    stageViewState.subscribe((current) => {
      const state = { id: current.id };
      stateStorage.set(`stageView|${graphName}`, state);
    });

    const prevWorkspaceState = await stateStorage.get(`workspaceState|${graphName}`);

    if (
      prevWorkspaceState !== null &&
      typeof prevWorkspaceState === "object" &&
      "focus" in prevWorkspaceState &&
      typeof prevWorkspaceState?.focus === "string" &&
      (prevWorkspaceState.focus === "stage" ||
        prevWorkspaceState.focus === "search" ||
        prevWorkspaceState.focus === "timeline")
    ) {
      workspaceStateStore.setState({ focus: prevWorkspaceState.focus });
    }

    workspaceStateStore.subscribe((current) => {
      const state = { focus: current.focus };
      stateStorage.set(`workspaceState|${graphName}`, state);
    });
  }

  return workspaceStateStore;
}
