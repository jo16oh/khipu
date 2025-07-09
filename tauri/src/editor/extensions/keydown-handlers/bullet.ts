import { EditorView } from "@tiptap/pm/view";
import { Editor, JSONContent } from "@tiptap/react";
import { FocusManager } from "src/stores/focus-manager";
import { OutlineStore } from "src/stores/outline-store";
import { KeyboardEventHandler } from "src/utils/keyboard-event-handler";
import { Key } from "ts-keycode-enum";

export function createBulletKeydownHandlers(
  outlineId: string,
  store: OutlineStore,
  focusManager: FocusManager,
): KeyboardEventHandler<[EditorView, Editor]>[] {
  return [
    {
      on: [Key.Enter],
      fn: (event, view, editor) => {
        if (event.isComposing || event.key === "Process") return;

        const start = view.state.selection.from;
        const end = view.state.doc.content.size;

        const rightContent: JSONContent[] = view.state.doc
          .slice(start, end)
          .toJSON()
          .content.map((node: JSONContent) => ({ type: "paragraph", content: node.content }));

        const doc: JSONContent = { type: "doc", content: rightContent };

        const outline = store.getOutline(outlineId);

        if (!outline?.parentId) return;

        const newOutlineId = store.reducer.create(
          "bullet",
          outline.parentId,
          { after: outline },
          doc,
        );

        editor.commands.blur();
        focusManager.focus({ id: newOutlineId, position: "start" });
      },
    },
    {
      on: [Key.UpArrow, ["meta"]],
      fn: () => {
        const children = store.getOutlineChildren(outlineId);
        if (children && children.size) {
          store.reducer.collapse(outlineId);
        }
        return true;
      },
    },
    {
      on: [Key.DownArrow, ["meta"]],
      fn: () => {
        const children = store.getOutlineChildren(outlineId);
        if (children && children.size) {
          store.reducer.expand(outlineId);
        }
        return true;
      },
    },
  ];
}
