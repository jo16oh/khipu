import type { JSONContent } from "@tiptap/react";
import { Outline } from "src/model";
import { FractionallyIndexedList } from "src/utils";
import type { DeepReadonly } from "ts-essentials";
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

class ChildrenStore {
  #parentToChildrenMap = new Map<
    string,
    FractionallyIndexedList<{ id: string; findex: string }>
  >();
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
            this.#parentToChildrenMap.set(
              o.parentId,
              FractionallyIndexedList.from([o]),
            );
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

  get(id: string): DeepReadonly<string[]> {
    const children = this.#parentToChildrenMap.get(id);
    return children ? Array.from(children, (c) => c.id) : [];
  }

  subscribe(id: string, cb: () => void) {
    this.#subscribers.subscribe(id, cb);
    return () => {
      this.#subscribers.unsubscribe(id, cb);
    };
  }
}

export class OutlineStore {
  #outlines = new Map<string, Outline>();
  #children = new ChildrenStore();
  #ydocs = new Map<string, Y.Doc>();
  #pendingYUpdates = new Map<string, Uint8Array[]>();
  #outlineSubscribers = new SubscribersMap<[]>();
  #docUpdateNotifier: DocUpdateNotifier;

  constructor(docUpdateNotifier: DocUpdateNotifier) {
    this.#docUpdateNotifier = docUpdateNotifier;
  }

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
          if (outline) this.#outlines.set(o.id, { ...outline, doc });
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

  getOutlineChildren(id: string): DeepReadonly<string[]> {
    return this.#children.get(id);
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
