import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineStore } from "./outline-store";

const Notifier = new DocUpdateNotifier();
// @ts-expect-error commands are not used in this test
const Store = new OutlineStore(Notifier, {});

describe("OutlineStoreReducer", () => {
  it("doc initialization", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "test" }] }],
    };

    const id = Store.reducer.create("bullet", null, "start", doc);

    const ydoc = Store.getYDoc(id);
    const yxml = ydoc.getXmlFragment("doc");

    expect(yxml.toJSON()).toBe("<paragraph>test</paragraph>");
  });
});
