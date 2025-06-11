import { use, useMemo, useSyncExternalStore } from "react";
import { useOutlineStore } from "src/Providers";
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

  const fetchPromise = useMemo(async () => {
    await store.loader.fetchTree(id);
  }, [id]);

  use(fetchPromise);

  if (!outline) throw new Error("outline not found");

  return [outline, children ?? []];
}
