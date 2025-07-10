import { Schema } from "@tiptap/pm/model";
import { JSONContent } from "src/model";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

type NodesGroupedByType = { [key in string]: JSONContent[] };

export function extractTextFromDoc(doc: JSONContent) {
  const results: string[] = [];
  const stack = [doc];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node.text) results.push(node.text);
    if (node.content) {
      for (const child of node.content.toReversed()) {
        stack.push(child);
      }
    }
  }

  return results.join(" ");
}

function findNodesByTypeNameImpl(doc: JSONContent, typeNames: string[], buf: NodesGroupedByType) {
  if (!doc.content) return;

  for (const c of doc.content) {
    for (const query of typeNames) {
      if (c.type === query) buf[c.type]!.push(c);
    }

    findNodesByTypeNameImpl(c, typeNames, buf);
  }
}

export function findNodesByTypeName(doc: JSONContent, typeNames: string[]): NodesGroupedByType {
  const buf: NodesGroupedByType = {};

  for (const type of typeNames) {
    buf[type] = [];
  }

  findNodesByTypeNameImpl(doc, typeNames, buf);

  return buf;
}

export function insertJSONContentsToYXMLFragment(
  content: JSONContent[],
  schema: Schema,
  fragment: Y.XmlFragment,
  ydoc: Y.Doc,
  appendToLastNode?: boolean,
) {
  const doc = {
    type: "doc",
    content: content,
  };

  const fragments = new Y.Doc().getXmlFragment();
  prosemirrorJSONToYXmlFragment(schema, doc, fragments);

  const lastNode = fragment.get(fragment.length - 1);

  ydoc.transact(() => {
    fragments.forEach((e, i) => {
      if (i === 0 && e.length === 0) {
        return;
      } else if (
        appendToLastNode &&
        i === 0 &&
        lastNode instanceof Y.XmlElement &&
        e instanceof Y.XmlElement &&
        lastNode.nodeName === e.nodeName
      ) {
        e.forEach((e) => {
          lastNode.insert(lastNode.length, [e.clone()]);
        });
      } else {
        fragment.insert(fragment.length, [e.clone()]);
      }
    });
  });
}
