import type { JSONContent } from "@tiptap/react";
import { generateKeyBetween } from "fractional-indexing-jittered";
import { OutlineType } from "generated/tauri-commands";
import { WritableDraft, produce } from "immer";
import { getSchemaOf } from "src/editor/schema";
import { Outline } from "src/model";
import { FractionallyIndexedList, uuidv7bs58 } from "src/utils";
import type { DeepReadonly } from "ts-essentials";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";

class SubscribersMap<Args extends unknown[]> {
  #map = new Map<string, Set<(...args: Args) => void>>();
  #cleanupCallbacks = new Map<string, Array<() => void>>();

  subscribe(id: string, listener: (...args: Args) => void) {
    const set = this.#map.get(id);
    if (set) {
      set.add(listener);
    } else {
      this.#map.set(id, new Set([listener]));
    }
  }

  unsubscribe(id: string, cb: (...args: Args) => void) {
    const set = this.#map.get(id);
    if (set) {
      set.delete(cb);
      if (set.size === 0) {
        this.#map.delete(id);
        this.#cleanupCallbacks.get(id)?.forEach((cleanup) => cleanup());
        this.#cleanupCallbacks.delete(id);
      }
    }
  }

  notify(id: string, ...args: Args) {
    this.#map.get(id)?.forEach((cb) => cb(...args));
  }

  onUnsubscribedAll(id: string, cb: () => void) {
    const set = this.#cleanupCallbacks.get(id);
    if (set) {
      set.push(cb);
    } else {
      this.#cleanupCallbacks.set(id, [cb]);
    }
  }
}

class OutlineChildrenStore {
  #parentToChildrenMap = new Map<string, FractionallyIndexedList<{ id: string; findex: string }>>();
  #childToParentMap = new Map<string, string>();
  #subscribers = new SubscribersMap<[]>();

  set(...outlines: Outline[]) {
    const changedParentIds = new Set<string>();

    for (const o of outlines) {
      const prevParentId = this.#childToParentMap.get(o.id) ?? null;

      // if parentId is changed or newly set
      if (prevParentId !== o.parentId) {
        // add to changed parentIds set
        if (o.parentId) {
          changedParentIds.add(o.parentId);
        } else if (prevParentId) {
          changedParentIds.add(prevParentId);
        }

        // reconcile childToParentMap
        if (o.parentId) {
          this.#childToParentMap.set(o.id, o.parentId);
        } else {
          this.#childToParentMap.delete(o.id);
        }

        // reconcile parentToChildrenMap
        if (o.parentId) {
          const children = this.#parentToChildrenMap.get(o.parentId);
          if (children) {
            children.insert(o);
          } else {
            this.#parentToChildrenMap.set(o.parentId, FractionallyIndexedList.from([o]));
          }
        } else if (prevParentId) {
          this.#parentToChildrenMap.get(prevParentId)?.delete(o.id);
        }
      }

      // notify changes to listeners
      for (const id of changedParentIds) {
        this.#subscribers.notify(id);
      }
    }
  }

  delete(outlineId: string) {
    const parentId = this.#childToParentMap.get(outlineId);
    if (parentId) {
      this.#parentToChildrenMap.get(parentId)?.delete(outlineId);
      this.#childToParentMap.delete(outlineId);
    }
    this.#parentToChildrenMap.delete(outlineId);
  }

  get(id: string) {
    return this.#parentToChildrenMap.get(id);
  }

  subscribe(id: string, cb: () => void) {
    this.#subscribers.subscribe(id, cb);
    return () => {
      this.#subscribers.unsubscribe(id, cb);
    };
  }
}

type OutlineStoreUpdater = (id: string, update: (draft: WritableDraft<Outline>) => void) => void;

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

export class DocUpdateNotifier {
  #subscribers = new SubscribersMap<[doc: JSONContent]>();

  subscribe(id: string, cb: (doc: JSONContent) => void) {
    this.#subscribers.subscribe(id, cb);
    return () => {
      this.#subscribers.unsubscribe(id, cb);
    };
  }

  notify(id: string, doc: JSONContent) {
    this.#subscribers.notify(id, doc);
  }
}

type Id = string;

class OutlineStoreReducer {
  #store: OutlineStore;
  #childrenStore: OutlineChildrenStore;
  #updateOutline: OutlineStoreUpdater;

  constructor(
    store: OutlineStore,
    childrenStore: OutlineChildrenStore,
    updateOutline: OutlineStoreUpdater,
  ) {
    this.#store = store;
    this.#childrenStore = childrenStore;
    this.#updateOutline = updateOutline;
  }

  create(
    parentId: string | null = null,
    position: "start" | "end" | { after: Outline } = "start",
    type: OutlineType,
    doc: JSONContent = {},
  ) {
    const findex = (() => {
      if (!parentId) return generateKeyBetween(null, null);
      const list = this.#childrenStore.get(parentId);
      if (!list) throw new Error("Insert target outline not found");
      return list.generateFractionalIndex(position);
    })();

    const now = new Date();

    const o: Outline = {
      id: uuidv7bs58(),
      parentId,
      doc: doc,
      type,
      findex,
      completed: false,
      collapsed: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    const ydoc = this.#store.getYDoc(o.id);
    const ymap = ydoc.getMap("props");
    const yxml = ydoc.getXmlFragment("doc");
    prosemirrorJSONToYXmlFragment(getSchemaOf(type), doc, yxml);
    ymap.set("parentId", o.parentId);
    ymap.set("type", o.type);
    ymap.set("findex", o.findex);
    ymap.set("completed", o.completed);
    ymap.set("collapsed", o.collapsed);
    ymap.set("deleted", o.deleted);

    this.#store.register(o);

    return o.id;
  }

  move(outlineIds: Id[], to: Id | "root", position: "start" | "end" | { after: Outline }) {
    const parentId = to === "root" ? null : to;

    const findex = (() => {
      if (to === "root") return generateKeyBetween(null, null);
      const list = this.#childrenStore.get(to);
      if (!list) throw new Error("Insert target outline not found");
      return list.generateFractionalIndex(position);
    })();

    for (const [i, id] of outlineIds.entries()) {
      this.#updateOutline(id, (draft) => {
        draft.parentId = parentId;
        draft.findex = findex + String(i);
      });
    }
  }

  toggleCompleted(...ids: string[]) {
    for (const id of ids) {
      this.#updateOutline(id, (draft) => {
        draft.completed = !draft.completed;
      });
    }
  }

  toggleCollapsed(...ids: string[]) {
    for (const id of ids) {
      this.#updateOutline(id, (draft) => {
        draft.collapsed = !draft.collapsed;
      });
    }
  }

  delete(...ids: string[]) {
    for (const id of ids) {
      this.#updateOutline(id, (draft) => {
        draft.deleted = true;
      });
    }
  }


}
