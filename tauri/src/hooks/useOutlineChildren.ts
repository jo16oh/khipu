import { memoize } from "es-toolkit";
import { useMemo, useSyncExternalStore } from "react";
import { useOutlineStore } from "src/stores/outline-store";

export function useOutlineChildren(id: string): string[] {
  const store = useOutlineStore();

  type Children = ReturnType<typeof store.getOutlineChildren> | null;
  const extractIds = useMemo(() => memoize((c: Children) => c?.map(({ id }) => id) ?? []), []);

  return useSyncExternalStore(
    (cb) => store.subscribeToOutlineChildren(id, cb),
    () => extractIds(store.getOutlineChildren(id) ?? null),
  );
}
