import { createContext, use } from "react";
import { type StoreApi, createStore, useStore } from "zustand";
import { FocusManager } from "./focus-manager";

const MAX_HISTORY_LEN = 100;

export type View = {
  id: string | null;
  scrollPosition: number;
};

export type ViewState = {
  id: string | null;
  focusManager: FocusManager;
  jump: (view: View) => void;
  back: () => void;
  next: () => void;
  hasPrevious: () => boolean;
  hasNext: () => boolean;
  currentScrollPosition: () => number;
  recordScrollPosition: (scrollPosition: number) => void;
};

type InternalViewState = ViewState & {
  scrollPosition: number;
  backHistory: View[];
  nextHistory: View[];
};

export type ViewStateStore = StoreApi<ViewState>;

export const ViewStateStoreContext = createContext<ViewStateStore | null>(null);

export function useViewState<U>(selector: (state: ViewState) => U) {
  const store = use(ViewStateStoreContext);
  if (!store) throw new Error("ViewStateStoreContext is not set");
  return useStore(store, selector);
}

export function createViewStateStore(): ViewStateStore {
  return createStore<InternalViewState>((set, get) => ({
    id: null,
    scrollPosition: 0,
    backHistory: [],
    nextHistory: [],

    focusManager: new FocusManager(),

    jump: (view) =>
      set((state) => {
        if (view.id === state.id) return { scrollPosition: view.scrollPosition };

        const newBackHistory = state.id
          ? [...state.backHistory, { id: state.id, scrollPosition: state.scrollPosition }]
          : state.backHistory;

        while (newBackHistory.length > MAX_HISTORY_LEN) {
          newBackHistory.shift();
        }

        return {
          id: view.id,
          scrollPosition: view.scrollPosition,
          backHistory: newBackHistory,
          nextHistory: [],
        };
      }),

    back: () =>
      set((state) => {
        if (state.backHistory.length === 0) return {};
        const newBackHistory = [...state.backHistory];
        const viewToRestore = newBackHistory.pop()!;
        const newNextHistory = state.id
          ? [...state.nextHistory, { id: state.id, scrollPosition: state.scrollPosition }]
          : state.nextHistory;

        return {
          id: viewToRestore.id,
          scrollPosition: viewToRestore.scrollPosition,
          backHistory: newBackHistory,
          nextHistory: newNextHistory,
        };
      }),

    next: () =>
      set((state) => {
        if (state.nextHistory.length === 0) return {};
        const newNextHistory = [...state.nextHistory];
        const viewToRestore = newNextHistory.pop()!;
        const newBackHistory = state.id
          ? [...state.backHistory, { id: state.id, scrollPosition: state.scrollPosition }]
          : state.backHistory;

        while (newBackHistory.length > MAX_HISTORY_LEN) {
          newBackHistory.shift();
        }

        return {
          id: viewToRestore.id,
          scrollPosition: viewToRestore.scrollPosition,
          backHistory: newBackHistory,
          nextHistory: newNextHistory,
        };
      }),

    hasPrevious: () => {
      return get().backHistory.length !== 0;
    },

    hasNext: () => {
      return get().nextHistory.length !== 0;
    },

    currentScrollPosition: () => {
      return get().scrollPosition;
    },

    recordScrollPosition: (scrollPosition) => {
      set(() => {
        return {
          scrollPosition: scrollPosition,
        };
      });
    },
  }));
}
