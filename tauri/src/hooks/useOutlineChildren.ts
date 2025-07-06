import { useSyncExternalStore } from "react";
import { useOutlineStore } from "src/stores/outline-store";

export function useOutlineChildren(id: string) {
  const store = useOutlineStore();

  return useSyncExternalStore(
    (cb) => store.subscribeToOutlineChildren(id, cb),
    () => store.getOutlineChildren(id),
  );
}
