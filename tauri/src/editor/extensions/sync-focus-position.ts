import { Extension } from "@tiptap/react";
import { FocusState } from "src/stores/focus-manager";

export function createSyncFocusPositionExtension(id: string, sync: (state: FocusState) => void) {
  return Extension.create({
    name: "sync-focus-position",
    onSelectionUpdate: (e) => sync?.({ id, position: e.editor.state.selection.from }),
  });
}
