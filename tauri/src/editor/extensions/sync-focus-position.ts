import { Extension } from "@tiptap/react";
import { FocusManager } from "src/stores/focus-manager";

export function createSyncFocusPositionExtension(id: string, focusManager: FocusManager) {
  return Extension.create({
    name: "sync-focus-position",
    onSelectionUpdate: ({ editor }) => {
      focusManager.syncFocusPosition({ id, position: editor.state.selection.from });
    },
  });
}
