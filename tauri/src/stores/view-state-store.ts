import { type StoreApi, createStore } from "zustand";

const MAX_HISTORY_LEN = 100;

export type ViewState = {
  id: string | null;
  scrollPosition: number;
};

export type ViewStateStoreState = {
  id: string | null;
  jump: (view: ViewState) => void;
  back: () => void;
  next: () => void;
  currentScrollPosition: () => number;
  recordScrollPosition: (scrollPosition: number) => void;
};

type InternalViewStateStoreState = ViewStateStoreState & {
  scrollPosition: number;
  backHistory: ViewState[];
  nextHistory: ViewState[];
};

export type ViewStateStore = StoreApi<ViewStateStoreState>;

export function createViewStateStore(): ViewStateStore {
  return createStore<InternalViewStateStoreState>((set, get) => ({
    id: null,
    scrollPosition: 0,
    backHistory: [],
    nextHistory: [],

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

    currentScrollPosition() {
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
