import { Outline } from "src/model";
import { FractionallyIndexedList } from "./fractionally-indexed-list";
import { SubscribersMap } from "./subscribers-map";

export class OutlineChildrenStore {
  #parentToChildrenMap = new Map<string, FractionallyIndexedList<{ id: string; findex: string }>>();
  #childToParentMap = new Map<string, string>();
  #subscribers = new SubscribersMap<string, []>();

  set(...outlines: Outline[]) {
    const changedParentIds = new Set<string>();

    for (const outline of outlines) {
      const prevParentId = this.#childToParentMap.get(outline.id) ?? null;

      if (prevParentId !== outline.parentId) {
        this.#updateParentTrackingMaps(outline, prevParentId, changedParentIds);
        this.#updateChildrenMaps(outline, prevParentId);
      }
    }

    // notify changes to listeners
    for (const id of changedParentIds) {
      this.#subscribers.notify(id);
    }
  }

  #updateParentTrackingMaps(outline: Outline, prevParentId: string | null, changedParentIds: Set<string>) {
    // track changed parent IDs for notifications
    if (outline.parentId) {
      changedParentIds.add(outline.parentId);
    }
    if (prevParentId) {
      changedParentIds.add(prevParentId);
    }

    // update child-to-parent mapping
    if (outline.parentId) {
      this.#childToParentMap.set(outline.id, outline.parentId);
    } else {
      this.#childToParentMap.delete(outline.id);
    }
  }

  #updateChildrenMaps(outline: Outline, prevParentId: string | null) {
    // add to new parent's children list
    if (outline.parentId) {
      const children = this.#parentToChildrenMap.get(outline.parentId);
      this.#parentToChildrenMap.set(
        outline.parentId,
        children?.toInserted(outline) || FractionallyIndexedList.from([outline]),
      );
    }

    // remove from previous parent's children list
    if (prevParentId) {
      const updatedChildren = this.#parentToChildrenMap.get(prevParentId)?.toDeleted(outline.id);
      if (updatedChildren) {
        if (updatedChildren.size > 0) {
          this.#parentToChildrenMap.set(prevParentId, updatedChildren);
        } else {
          this.#parentToChildrenMap.delete(prevParentId);
        }
      }
    }
  }

  delete(outlineId: string) {
    const parentId = this.#childToParentMap.get(outlineId);
    if (parentId) {
      const updatedChildren = this.#parentToChildrenMap.get(parentId)?.toDeleted(outlineId);
      if (updatedChildren) this.#parentToChildrenMap.set(parentId, updatedChildren);
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
