import { create } from "zustand";
import { FocusManager } from "./focus-manager";
import { ViewState, ViewStateStore, createViewStateStore } from "./view-state-store";

export type TabKind = "find" | "main";

type ViewContexts = {
  viewStateStore: ViewStateStore;
  focusManager: FocusManager;
};

type WindowState = {
  main: ViewContexts;
  hover: ViewContexts | null;
  focus: TabKind;
};

const mainViewStateStore = createViewStateStore();

if (typeof localStorage !== "undefined") {
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

export const useWindowState = create<WindowState>((set) => ({
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
