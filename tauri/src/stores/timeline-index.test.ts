import { expect, test } from "vitest";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineStore } from "./outline-store";

test("timeline-index", async () => {
  const notifier = new DocUpdateNotifier();
  // @ts-expect-error commands are not used in this test
  const store = new OutlineStore(notifier, {});

  const ids: string[] = [];
  const subscribers: Array<() => void> = [];

  function createTree(depth: number) {
    function createTreeImpl(parentId: string, maxDepth: number, currentDepth: number) {
      if (currentDepth <= maxDepth) {
        const id = store.reducer.create("bullet", parentId, undefined);
        ids.push(id);

        // Without subscribing, outlines will be discarded if store size is over 100
        // because undo manager subscribes to outline when initializing ydoc.
        subscribers.push(store.subscribeToOutline(id, () => {}));
        createTreeImpl(id, maxDepth, currentDepth + 1);
      }
    }

    const rootId = store.reducer.create("bullet", null, undefined);
    ids.push(rootId);
    subscribers.push(store.subscribeToOutline(rootId, () => {}));
    createTreeImpl(rootId, depth, 0);
  }

  for (const _ of Array(10).fill(null)) {
    createTree(10);
  }

  const result = store.getTimeline(new Date().getTime(), "createdAt");
  expect(result.length).toBe(10);
});
