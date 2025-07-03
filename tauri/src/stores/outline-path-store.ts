import { OutlineStore } from "./outline-store";
import { SubscribersMap } from "./subscribers-map";

type Id = string;
type Callback = () => void;

export class OutlinePathStore {
  #store: OutlineStore;
  #subscribers = new SubscribersMap<string, []>();

  constructor(store: OutlineStore) {
    this.#store = store;
  }

  subscribe(id: Id, cb: Callback) {
    this.#subscribers.subscribe(id, cb);
    return () => this.#subscribers.unsubscribe(id, cb);
  }

  getPath(id: Id) {
    if (this.#store.has(id)) {
      const buf: string[] = [];
      this.#getPathImpl(id, this.#store, buf);
      return buf;
    } else {
      return undefined;
    }
  }

  #getPathImpl(id: Id, store: OutlineStore, buf: string[]) {
    const outline = store.getOutline(id);
    if (outline?.parentId) {
      buf.unshift(outline.parentId);
      this.#getPathImpl(outline.parentId, store, buf);
    }
  }

  notify(changedOutlineId: Id) {
    this.#subscribers.notify(changedOutlineId);
    const children = this.#store.getOutlineChildren(changedOutlineId) ?? [];
    for (const { id } of children) {
      this.notify(id);
    }
  }
}
