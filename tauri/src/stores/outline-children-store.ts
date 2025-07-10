import { Outline } from "src/model";
import { FractionallyIndexedList } from "./fractionally-indexed-list";
import { SubscribersMap } from "./subscribers-map";

type OutlinePosition = {
  parentId: string | null;
  findex: string;
};

export class OutlineChildrenStore {
  #parentToChildrenMap = new Map<string, FractionallyIndexedList<{ id: string; findex: string }>>();
  #childToParentMap = new Map<string, string>();
  #prevPositionMap = new Map<string, OutlinePosition>();
  #subscribers = new SubscribersMap<string, []>();

  set(...outlines: Outline[]) {
    const changedParentIds = new Set<string>();

    for (const outline of outlines) {
      const prevPosition = this.#prevPositionMap.get(outline.id);
      const prevParentId = prevPosition?.parentId ?? null;
      const prevFindex = prevPosition?.findex ?? null;

      if (prevParentId !== outline.parentId || prevFindex !== outline.findex) {
        this.#updateParentTrackingMaps(outline, prevParentId, changedParentIds);
        this.#updateChildrenMaps(outline, prevParentId);
        this.#prevPositionMap.set(outline.id, {
          parentId: outline.parentId,
          findex: outline.findex,
        });

        // notify current parent if only findex changed
        if (prevParentId === outline.parentId && outline.parentId) {
          changedParentIds.add(outline.parentId);
        }
      }
    }

    // notify changes to listeners
    for (const id of changedParentIds) {
      this.#subscribers.notify(id);
    }
  }

  #updateParentTrackingMaps(
    outline: Outline,
    prevParentId: string | null,
    changedParentIds: Set<string>,
  ) {
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

      // notify changes to listeners
      this.#subscribers.notify(parentId);
    }
    this.#parentToChildrenMap.delete(outlineId);
    this.#prevPositionMap.delete(outlineId);
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
