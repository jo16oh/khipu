import { InputRule, Node } from "@tiptap/core";
import { OutlineStore } from "src/stores/outline-store";
import { extractTextFromDoc } from "../utils";

export function createHeadingExtension(id: string, store: OutlineStore) {
  return Node.create({
    name: "heading",
    content: "inline*",
    group: "block",
    defining: true,

    renderHTML({ HTMLAttributes }) {
      return [`div`, HTMLAttributes, 0];
    },

    addAttributes() {
      const isEmpty = this.editor
        ? String(this.editor.isEmpty)
        : (() => {
            const outline = store.getOutline(id);
            const text = outline ? extractTextFromDoc(outline.doc) : null;
            return text?.length ? "false" : "true";
          })();

      return {
        "data-is-empty": {
          default: isEmpty,
        },
      };
    },

    onUpdate() {
      this.editor.commands.updateAttributes("heading", {
        "data-is-empty": String(this.editor.isEmpty),
      });
    },

    addInputRules() {
      return [
        new InputRule({
          find: new RegExp(`(?:^|\\s)(#{1,6})\\s$`),

          handler: ({ range, commands }) => {
            commands.deleteRange(range);
            store.reducer.updateAttributes(id, { type: "heading", level: range.to - range.from });
          },
        }),
      ];
    },
  });
}
