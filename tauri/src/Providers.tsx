import { commands } from "generated/tauri-commands";
import { ReactNode, createContext, useContext } from "react";
import { DocUpdateNotifier } from "src/stores/doc-update-notifier";
import { OutlineStore } from "src/stores/outline-store";
import { FocusManager } from "./stores/focus-manager";

const OutlineStoreContext = createContext<OutlineStore | undefined>(undefined);

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

export default function RootProviders({ children }: { children: ReactNode }) {
  const notifier = new DocUpdateNotifier();
  const outlineStore = new OutlineStore(notifier, commands);
  const focusManager = new FocusManager();
  return (
    <OutlineStoreContext.Provider value={outlineStore}>
      <FocusManagerContext.Provider value={focusManager}>{children}</FocusManagerContext.Provider>
    </OutlineStoreContext.Provider>
  );
}
