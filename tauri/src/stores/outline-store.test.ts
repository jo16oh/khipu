import type { JSONContent } from "@tiptap/react";
import { YXmlFragment } from "node_modules/yjs/dist/src/internals";
import { describe, expect, it } from "vitest";
import { DocUpdateNotifier, OutlineStore } from "./outline-store";

const Notifier = new DocUpdateNotifier();
const Store = new OutlineStore(Notifier);

describe("OutlineStoreReducer", () => {
  it("doc initialization", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "test" }] },
      ],
    };

    const id = Store.reducer.create(null, undefined, "bullet", doc);

    const ydoc = Store.getYDoc(id);
    const yxml = ydoc.getXmlFragment("doc") as YXmlFragment;

    expect(yxml.toJSON()).toBe("<paragraph>test</paragraph>");
  });
});
