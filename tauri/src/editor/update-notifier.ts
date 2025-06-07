import { JSONContent, Node } from "@tiptap/react";
import { DocUpdateNotifier } from "src/stores/outline-store";

export function createUpdateNotifierExtension(outlineId: string, notifier: DocUpdateNotifier) {
  return Node.create({
    name: "doc-update-notifier",
    onUpdate(event) {
      const doc = event.editor.getJSON();
      notifier.notify(outlineId, doc as JSONContent);
    },
  });
}
