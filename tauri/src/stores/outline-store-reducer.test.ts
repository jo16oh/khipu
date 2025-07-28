import type { JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineStore } from "./outline-store";
import { createWorkspaceStateStore } from "./workspace-state-store";

describe("OutlineStoreReducer", async () => {
  const notifier = new DocUpdateNotifier();
  const workspaceStore = await createWorkspaceStateStore({ graphName: "test" });
  // @ts-expect-error commands aren't used in this test
  const store = new OutlineStore(notifier, workspaceStore, {});

  it("doc initialization", async () => {
    const doc: JSONContent = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "test" }] }],
    };

    const id = store.reducer.create({ type: "bullet" }, null, "start", doc);

    const ydoc = await store.getYDoc(id);
    const yxml = ydoc.getXmlFragment("doc");

    expect(yxml.toJSON()).toBe("<paragraph>test</paragraph>");
  });
});
