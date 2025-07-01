import { useSuspenseQuery } from "@tanstack/react-query";
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

export function useWorkspaceStateStore(graphName: string) {
  const { data: store } = useSuspenseQuery({
    queryKey: ["workspaceState", graphName],
    queryFn: () => createWorkspaceStateStore(graphName),
    staleTime: Infinity,
  });

  return store;
}

export async function renameSavedWorkspaceState(prevGraphName: string, currentGraphName: string) {
  const prev = await StateStorage.get("stageView" + prevGraphName);
  await StateStorage.set("stageView" + currentGraphName, prev);
  await StateStorage.delete("stageView" + prevGraphName);
}

async function createWorkspaceStateStore(graphName: string): Promise<WorkspaceStateStore> {
  const initialState = await StateStorage.get("stageView" + graphName);

  const mainViewStateStore = createViewStateStore();

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
    StateStorage.set("stageView" + graphName, state);
  });

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
