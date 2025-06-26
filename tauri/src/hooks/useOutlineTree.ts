import { useSyncExternalStore } from "react";
import { useOutlineStore } from "src/stores/outline-store"
import { Outline } from "src/model";

export function useOutlineTree(id: string): [Outline, string[]] {
  const store = useOutlineStore();

  const outline = useSyncExternalStore(
    (cb) => store.subscribeToOutline(id, cb),
    () => store.getOutline(id),
  );

  const children = useSyncExternalStore(
    (cb) => store.subscribeToOutlineChildren(id, cb),
    () => store.getOutlineChildren(id),
  );

  if (!outline) throw new Error("outline not found");

  return [outline, children ?? []];
}
