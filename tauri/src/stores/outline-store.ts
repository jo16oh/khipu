import { WritableDraft, produce } from "immer";
import { Outline } from "src/model";
import type { DeepReadonly } from "ts-essentials";
import * as Y from "yjs";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineChildrenStore } from "./outline-children-store";
import { OutlineStoreReducer } from "./outline-store-reducer";
import { SubscribersMap } from "./subscribers-map";

export type OutlineStoreUpdater = (
  id: string,
  update: (draft: WritableDraft<Outline>) => void,
) => void;

export class OutlineStore {
  #outlines = new Map<string, Outline>();
  #children = new OutlineChildrenStore();
  #ydocs = new Map<string, Y.Doc>();
  #pendingYUpdates = new Map<string, Uint8Array[]>();
  #outlineSubscribers = new SubscribersMap<[]>();
  #docUpdateNotifier: DocUpdateNotifier;

  constructor(docUpdateNotifier: DocUpdateNotifier) {
    this.#docUpdateNotifier = docUpdateNotifier;
  }

  #update: OutlineStoreUpdater = (id, update) => {
    const before = this.getOutline(id);
    if (!before) throw new Error("outline not found");

    const after = produce(before, (draft) => {
      update(draft);
      draft.id = before.id;
      draft.updatedAt = new Date();
    });

    this.#updateYDoc(before, after);
    this.#outlines.set(id, after);
    this.#outlineSubscribers.notify(id);
  };

  #updateYDoc(before: Outline, after: Outline) {
    const ydoc = this.getYDoc(before.id);
    const ymap = ydoc.getMap("props");

    if (before.parentId !== after.parentId) ymap.set("parentId", after.parentId);
    if (before.findex !== after.findex) ymap.set("findex", after.findex);
    if (before.type !== after.type) ymap.set("type", after.type);
    if (before.completed !== after.completed) ymap.set("completed", after.completed);
    if (before.collapsed !== after.collapsed) ymap.set("collapsed", after.collapsed);
    if (before.deleted !== after.deleted) ymap.set("deleted", after.deleted);
  }

  readonly reducer = new OutlineStoreReducer(this, this.#children, this.#update);

  register(...outlines: Outline[]) {
    for (const o of outlines) {
      const old = this.#outlines.get(o.id);
      if (!old || old.updatedAt < o.updatedAt) {
        this.#outlines.set(o.id, o);
        this.#children.set(o);
      }

      // register cleanup callbacks
      if (!old) {
        const unsubscribe = this.#docUpdateNotifier.subscribe(o.id, (doc) => {
          const outline = this.#outlines.get(o.id);
          if (outline) this.#update(outline.id, (draft) => (draft.doc = doc));
        });

        this.#outlineSubscribers.onUnsubscribedAll(o.id, () => {
          this.#outlines.delete(o.id);
          this.#children.delete(o.id);
          this.#ydocs.delete(o.id);
          unsubscribe();
        });
      }
    }
  }

  getOutline(id: string): DeepReadonly<Outline> | undefined {
    return this.#outlines.get(id);
  }

  getOutlineChildren(id: string) {
    return this.#children.get(id)?.intoArray();
  }

  getYDoc(id: string) {
    const ydoc = this.#ydocs.get(id);
    if (ydoc) {
      return ydoc;
    } else {
      const ydoc = new Y.Doc();
      this.#ydocs.set(id, ydoc);
      ydoc.on("updateV2", (update) => {
        const arr = this.#pendingYUpdates.get(id);
        if (arr) {
          arr.push(update);
        } else {
          this.#pendingYUpdates.set(id, [update]);
        }
      });
      return ydoc;
    }
  }

  subscribeToOutline(id: string, cb: () => void) {
    this.#outlineSubscribers.subscribe(id, cb);
    return () => {
      this.#outlineSubscribers.unsubscribe(id, cb);
    };
  }

  subscribeToOutlineChildren(id: string, cb: () => void): () => void {
    return this.#children.subscribe(id, cb);
  }
}
