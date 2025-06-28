import Collabolation from "@tiptap/extension-collaboration";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Node } from "@tiptap/react";
import { Extensions, getSchema } from "@tiptap/react";
import { OutlineType } from "generated/tauri-commands";
import { DocUpdateNotifier } from "src/stores/doc-update-notifier";
import * as Y from "yjs";
import { createUpdateNotifierExtension } from "./update-notifier";

const SingleBlockDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block",
});

export function createExtensions(
  outlineId: string,
  ydoc: Y.Doc,
  type: OutlineType,
  notifier: DocUpdateNotifier,
): Extensions {
  const fragment = ydoc.getXmlFragment("doc");

  switch (type) {
    case "heading":
      return [
        SingleBlockDocument,
        Paragraph,
        Text,
        Collabolation.extend().configure({ fragment }),
        createUpdateNotifierExtension(outlineId, notifier),
      ];
    case "bullet":
      return [
        SingleBlockDocument,
        Paragraph,
        Text,
        Collabolation.extend().configure({ fragment }),
        createUpdateNotifierExtension(outlineId, notifier),
      ];
    case "card":
      return [
        Document,
        Paragraph,
        Text,
        Collabolation.extend().configure({ fragment }),
        createUpdateNotifierExtension(outlineId, notifier),
      ];
    case "code":
      return [
        Document,
        Paragraph,
        Text,
        Collabolation.extend().configure({ fragment }),
        createUpdateNotifierExtension(outlineId, notifier),
      ];
  }
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
