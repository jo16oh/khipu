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

// Check if localStorage is null to ensure localStorage is available.
// I don't know why, but somehow there's a situation where localStorage is null.
if (typeof localStorage !== "undefined" && localStorage !== null) {
  const prev = localStorage.getItem("mainView");
  if (prev) {
    const state = JSON.parse(prev);
    if (typeof state?.id === "string") mainViewStateStore.setState({ id: state.id });
  }

  mainViewStateStore.subscribe((current) => {
    const state = { id: current.id };
    localStorage.setItem("mainView", JSON.stringify(state));
  });
}

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
