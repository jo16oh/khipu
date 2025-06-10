import { OutlineStore } from "./outline-store";
import { SubscribersMap } from "./subscribers-map";

type Id = string;
type Callback = () => void;

export class OutlinePathStore {
  #store: OutlineStore;
  #subscribers = new SubscribersMap<[]>();

  constructor(store: OutlineStore) {
    this.#store = store;
  }

  subscribe(id: Id, cb: Callback) {
    this.#subscribers.subscribe(id, cb);
    return () => this.#subscribers.unsubscribe(id, cb);
  }

  getPath(id: Id) {
    const buf: string[] = [];
    this.#getPathImpl(id, this.#store, buf);
    return buf;
  }

  #getPathImpl(id: Id, store: OutlineStore, buf: string[]) {
    const outline = store.getOutline(id);
    if (outline?.parentId) {
      const parent = store.getOutline(outline.parentId);
      if (parent) buf.unshift(parent.id);
      if (parent?.parentId) this.#getPathImpl(parent.parentId, store, buf);
    }
  }

  notify(changedOutlineId: Id) {
    this.#subscribers.notify(changedOutlineId);
    const children = this.#store.getOutlineChildren(changedOutlineId) ?? [];
    for (const id of children) {
      this.notify(id);
    }
  }
}
