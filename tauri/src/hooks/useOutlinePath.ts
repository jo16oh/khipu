import { useSyncExternalStore } from "react";
import { useOutlineStore } from "src/Providers";

export function useOutlinePath(id: string): string[] {
  const store = useOutlineStore();

  const path = useSyncExternalStore(
    (cb) => store.subscribeToOutlinePath(id, cb),
    () => store.getOutlinePath(id),
  );

  if (path === undefined) throw new Error("outline not found");

  return path;
}
