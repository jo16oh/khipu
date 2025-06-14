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

export const useWindowState = create<WindowState>((set) => ({
  main: {
    viewStateStore: createViewStateStore(),
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
