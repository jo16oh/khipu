import { LazyStore } from "@tauri-apps/plugin-store";
import { create } from "zustand";
import { FocusManager } from "./focus-manager";
import { ViewState, ViewStateStore, createViewStateStore } from "./view-state-store";

export type TabKind = "find" | "main";

type ViewContexts = {
  viewStateStore: ViewStateStore;
  focusManager: FocusManager;
};

type WorkspaceState = {
  main: ViewContexts;
  hover: ViewContexts | null;
  focus: TabKind;
};

const mainViewStateStore = createViewStateStore();

export const useWorkspaceState = create<WorkspaceState>((set) => ({
  main: {
    viewStateStore: mainViewStateStore,
    focusManager: new FocusManager(),
  },
  hover: null,
  focus: "main",
  switchTab: (to: TabKind) => {
    set(() => ({ focus: to }));
  },
  openHover: (view: ViewState) => {
    set((current) => {
      if (current.hover) {
        current.hover.viewStateStore.getState().jump(view);
        return {};
      } else {
        const store = createViewStateStore();
        store.getState().jump(view);
        return {
          hover: {
            viewStateStore: store,
            focusManager: new FocusManager(),
          },
        };
      }
    });
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
