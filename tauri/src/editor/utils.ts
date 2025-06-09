import { JSONContent } from "@tiptap/react";

type NodesGroupedByType = { [key in string]: JSONContent[] };

function findNodesByTypeNameImpl(doc: JSONContent, typeNames: string[], buf: NodesGroupedByType) {
  if (!doc.content) return;

  for (const c of doc.content) {
    for (const query of typeNames) {
      if (c.type === query) buf[c.type]!.push(c);
    }

    findNodesByTypeNameImpl(c, typeNames, buf);
  }
}
