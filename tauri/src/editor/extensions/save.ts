import { Extension } from "@tiptap/react";
import { OutlineStore } from "src/stores/outline-store";

export function createSaveExtension(id: string, store: OutlineStore) {
  return Extension.create({
    name: "save",
    onDestroy: () => store.save(id),
  });
}
