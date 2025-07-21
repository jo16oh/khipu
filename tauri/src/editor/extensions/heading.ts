import Heading from "@tiptap/extension-heading";
import { OutlineStore } from "src/stores/outline-store";
import { extractTextFromDoc } from "../utils";

export function createHeadingExtension(id: string, store: OutlineStore) {
  return Heading.extend({
    addAttributes() {
      const isEmpty = this.editor
        ? String(this.editor.isEmpty)
        : (() => {
            const outline = store.getOutline(id);
            const text = outline ? extractTextFromDoc(outline.doc) : null;
            return text?.length ? "false" : "true";
          })();

      return {
        ...this.parent?.(),
        "data-is-empty": {
          default: isEmpty,
        },
      };
    },
    addKeyboardShortcuts() {
      return {
        ...this.parent?.(),
        Backspace: () => {
          const { selection } = this.editor.state;
          const { $from, $to } = selection;

          // When selecting all (cmd+A), delete heading and re-insert with same level
          if ($from.pos === 0 && $to.pos === this.editor.state.doc.content.size) {
            const firstChild = this.editor.state.doc.firstChild;
            if (firstChild && firstChild.type === this.type) {
              const currentLevel = firstChild.attrs["level"];
              this.editor.commands.deleteSelection();
              this.editor.commands.setHeading({ level: currentLevel });
              return true;
            }
          }

          // When backspace on empty heading, do nothing
          if (
            selection.empty &&
            $from.parent.type === this.type &&
            $from.parent.textContent === ""
          ) {
            return true;
          }

          return false;
        },
      };
    },
    onUpdate() {
      this.editor.commands.updateAttributes("heading", {
        "data-is-empty": String(this.editor.isEmpty),
      });
    },
  });
}
