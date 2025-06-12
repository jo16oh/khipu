import { useSyncExternalStore } from "react";
import { useOutlineStore } from "src/Providers";
import { Outline } from "src/model";

export function useOutline(id: string): Outline {
  const store = useOutlineStore();

  const outline = useSyncExternalStore(
    (cb) => store.subscribeToOutline(id, cb),
    () => store.getOutline(id),
  );

  if (!outline) throw new Error("outline not found");

  return outline;
}
