import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { FocusManager } from "./focus-manager";
import { OutlineStore } from "./outline-store";
import { createViewStateStore } from "./view-state-store";

const notifier = new DocUpdateNotifier();
const focusManager = new FocusManager();
const viewStore = createViewStateStore();
// @ts-expect-error commands are not used in this test
const store = new OutlineStore(notifier, focusManager, viewStore, {});

describe("OutlineStoreReducer", () => {
  it("doc initialization", () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "test" }] }],
    };

    const id = store.reducer.create("bullet", null, "start", doc);

    const ydoc = store.getYDoc(id);
    const yxml = ydoc.getXmlFragment("doc");

    expect(yxml.toJSON()).toBe("<paragraph>test</paragraph>");
  });
});
