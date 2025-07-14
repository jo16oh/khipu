import { MemoizeCache, memoize } from "es-toolkit";
import { OutlineStore } from "./outline-store";
import { SubscribersMap } from "./subscribers-map";

type Id = string;
type Callback = () => void;

type MemoizedGetPathImpl = ((id: Id) => string[] | undefined) & {
  cache: MemoizeCache<string, string[] | undefined>;
};

export class OutlinePathStore {
  #store: OutlineStore;
  #subscribers = new SubscribersMap<string, []>();
  #memoizedGetPath: MemoizedGetPathImpl;

  constructor(store: OutlineStore) {
    this.#store = store;
    this.#memoizedGetPath = memoize((id: Id) => this.#getPathImpl(id));
  }

  subscribe(id: Id, cb: Callback) {
    this.#subscribers.subscribe(id, cb);
    return () => this.#subscribers.unsubscribe(id, cb);
  }

  getPath(id: Id) {
    return this.#memoizedGetPath(id);
  }

  #getPathImpl(id: Id): string[] {
    const buf: string[] = [];
    if (this.#store.has(id)) {
      this.#buildPath(id, this.#store, buf);
    }
    return buf;
  }

  #buildPath(id: Id, store: OutlineStore, buf: string[]) {
    const outline = store.getOutline(id);
    if (outline?.parentId) {
      buf.unshift(outline.parentId);
      this.#buildPath(outline.parentId, store, buf);
    }
  }

  notify(changedOutlineId: Id) {
    this.#memoizedGetPath.cache.delete(changedOutlineId);
    this.#subscribers.notify(changedOutlineId);
    const children = this.#store.getOutlineChildren(changedOutlineId) ?? [];
    for (const { id } of children) {
      this.notify(id);
    }
  }
}
