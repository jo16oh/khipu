import { commands } from "generated/tauri-commands";
import { ReactNode, createContext, useContext } from "react";
import { DocUpdateNotifier } from "src/stores/doc-update-notifier";
import { OutlineStore } from "src/stores/outline-store";
import { useStore } from "zustand";
import { FocusManager } from "./stores/focus-manager";
import { ViewStateStore, ViewStateStoreState } from "./stores/view-state-store";

const OutlineStoreContext = createContext<OutlineStore | undefined>(undefined);

const ViewStoreContext = createContext<ViewStateStore | undefined>(undefined);

const FocusManagerContext = createContext<FocusManager | undefined>(undefined);

export function useOutlineStore() {
  const context = useContext(OutlineStoreContext);
  if (!context) throw new Error("OutlineStoreContext is not set");
  return context;
}

export function useFocusManager() {
  const context = useContext(FocusManagerContext);
  if (!context) throw new Error("FocusManagerContext is not set");
  return context;
}

export function useViewStore(selector: (state: ViewStateStoreState) => void) {
  const viewStore = useContext(ViewStoreContext);
  if (!viewStore) throw new Error("ViewStoreContext is not set");
  return useStore(viewStore, selector);
}

export function RootProviders({ children }: { children: ReactNode }) {
  const notifier = new DocUpdateNotifier();
  const focusManager = new FocusManager();
  const outlineStore = new OutlineStore(notifier, commands);
  return (
    <OutlineStoreContext.Provider value={outlineStore}>
      <FocusManagerContext.Provider value={focusManager}>{children}</FocusManagerContext.Provider>
    </OutlineStoreContext.Provider>
  );
}
