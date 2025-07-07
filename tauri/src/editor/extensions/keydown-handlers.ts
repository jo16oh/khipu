import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Editor, Extension } from "@tiptap/react";

export function createKeydownHandlersExtension(handlers: {
  [key: string]: (view: EditorView, event: KeyboardEvent, editor: Editor) => void;
}) {
  return Extension.create({
    name: "KeydownHandlers",
    addProseMirrorPlugins() {
      const editor = this.editor;
      return [
        new Plugin({
          key: new PluginKey("KeydownHandlers"),
          props: {
            handleKeyDown(view, event) {
              handlers[event.key]?.(view, event, editor);
            },
          },
        }),
      ];
    },
  });
}
