import { LazyStore } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { ViewStateStore, createViewStateStore } from "./view-state-store";

export type TabKind = "find" | "main";

type WorkspaceState = {
  main: ViewStateStore;
  hover: ViewStateStore | null;
  focus: TabKind;
  switchTab: (to: TabKind) => void;
  openHover: (view: ViewStateStore) => void;
  closeHover: () => void;
};

const mainViewStateStore = createViewStateStore();

export const useWorkspaceState = create<WorkspaceState>((set) => ({
  main: mainViewStateStore,
  hover: null,
  focus: "main",
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

export async function initWorkspaceState(stateStorage: LazyStore) {
  const prev = stateStorage.get("mainView");

  if (prev !== null && typeof prev === "object" && "id" in prev && typeof prev?.id === "string") {
    mainViewStateStore.setState({ id: prev.id });
  }

  mainViewStateStore.subscribe((current) => {
    const state = { id: current.id };
    stateStorage.set("mainView", state);
  });
}
