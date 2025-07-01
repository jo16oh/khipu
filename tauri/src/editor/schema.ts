import Collabolation from "@tiptap/extension-collaboration";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Extensions, getSchema, Node } from "@tiptap/react";
import { OutlineType } from "generated/tauri-commands";
import { DocUpdateNotifier } from "src/stores/doc-update-notifier";
import { FocusManager } from "src/stores/focus-manager";
import * as Y from "yjs";
import { createSyncFocusPositionExtension } from "./extensions/sync-focus-position";
import { createUpdateNotifierExtension } from "./extensions/update-notifier";

const SingleBlockDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block",
});

export function createRendererExtensions(type: OutlineType): Extensions {
  switch (type) {
    case "heading":
      return [SingleBlockDocument, Paragraph, Text];
    case "bullet":
      return [SingleBlockDocument, Paragraph, Text];
    case "card":
      return [Document, Paragraph, Text];
    case "code":
      return [Document, Paragraph, Text];
  }
}

export function createEditorExtensions(
  outlineId: string,
  ydoc: Y.Doc,
  type: OutlineType,
  notifier: DocUpdateNotifier,
  focusManager: FocusManager,
): Extensions {
  const fragment = ydoc.getXmlFragment("doc");

  return [
    ...createRendererExtensions(type),
    Collabolation.extend().configure({ fragment }),
    createUpdateNotifierExtension(outlineId, notifier),
    createSyncFocusPositionExtension(outlineId, focusManager),
  ];
}

export function getSchemaOf(type: OutlineType) {
  switch (type) {
    case "heading":
      return getSchema([SingleBlockDocument, Paragraph, Text]);
    case "bullet":
      return getSchema([SingleBlockDocument, Paragraph, Text]);
    case "card":
      return getSchema([Document, Paragraph, Text]);
    case "code":
      return getSchema([Document, Paragraph, Text]);
  }
}
