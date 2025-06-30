import { Extension } from "@tiptap/react";

export function createOnBlurDestroyEditorExtension() {
  return Extension.create({
    onBlur: (e) => e.editor.destroy(),
  });
}
