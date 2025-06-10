import { commands } from "generated/tauri-commands";
import { useSyncExternalStore } from "react";
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

  if (outline) {
    return [outline, children ?? []];
  } else {
    throw commands.tree(id).then((tree) => {
      const outlines = tree.map(Outline.from);
      store.register(...outlines);
      if (!store.getOutline(id)) throw new Error("outline not found");
    });
  }
}
