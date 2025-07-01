import { memoize } from "es-toolkit";
import { useMemo, useSyncExternalStore } from "react";
import { Outline } from "src/model";
import { useOutlineStore } from "src/stores/outline-store";

export function useOutline(id: string): Outline;
export function useOutline<T>(id: string, selector: (outline: Outline) => T): T;

export function useOutline<T>(
  id: string,
  selector: (outline: Outline) => T | Outline = (o) => o,
): T | Outline {
  const store = useOutlineStore();

  const memoizedSelector = useMemo(() => memoize(selector), [selector]);

  const state = useSyncExternalStore(
    (cb) => store.subscribeToOutline(id, cb),
    () => {
      const outline = store.getOutline(id);
      return outline ? memoizedSelector(outline) : null;
    },
  );

  if (state === null) {
    throw new Error("outline not found");
  }

  return state;
}
