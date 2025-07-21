import { EditorView } from "@tiptap/pm/view";
import { Editor, JSONContent } from "@tiptap/react";
import { FocusManager } from "src/stores/focus-manager";
import { OutlineStore } from "src/stores/outline-store";
import { ViewStateStore } from "src/stores/view-state-store";
import { KeyboardEventHandler } from "src/utils/keyboard-event-handler";
import { Key } from "ts-keycode-enum";

export function createHeadingKeydownHandlers(
  outlineId: string,
  store: OutlineStore,
  focusManager: FocusManager,
  viewStateStore: ViewStateStore,
): KeyboardEventHandler<[EditorView, Editor]>[] {
  return [
    {
      on: [Key.Enter],
      fn: (event, view, editor) => {
        if (event.isComposing || event.key === "Process") return;

        if (viewStateStore.getState().id === outlineId) {
          editor.commands.blur();
          const childId = store.reducer.create({ type: "bullet" }, outlineId, "start");
          focusManager.focus({ id: childId, position: "start" });
        } else {
          const start = view.state.selection.from;
          const end = view.state.doc.content.size;

          const rightContent: JSONContent[] = view.state.doc
            .slice(start, end)
            .toJSON()
            .content.map((node: JSONContent) => ({ type: "paragraph", content: node.content }));

          const doc: JSONContent = { type: "doc", content: rightContent };

          editor.commands.deleteRange({ from: start, to: end });

          const childId = store.reducer.create({ type: "bullet" }, outlineId, "start", doc);

          editor.commands.blur();
          focusManager.focus({ id: childId, position: "start" });
        }
      },
    },
  ];
}
