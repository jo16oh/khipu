import { Extension, JSONContent } from "@tiptap/react";
import { type DocUpdateNotifier } from "src/stores/doc-update-notifier";

export function createUpdateNotifierExtension(outlineId: string, notifier: DocUpdateNotifier) {
  return Extension.create({
    name: "doc-update-notifier",
    onUpdate(event) {
      const doc = event.editor.getJSON();
      notifier.notify(outlineId, doc as JSONContent);
    },
  });
}
