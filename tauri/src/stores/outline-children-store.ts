import { Outline } from "src/model";
import { FractionallyIndexedList } from "./fractionally-indexed-list";
import { SubscribersMap } from "./subscribers-map";

export class OutlineChildrenStore {
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
