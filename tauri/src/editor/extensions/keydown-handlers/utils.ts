import { OutlineStore } from "src/stores/outline-store";
import { ViewStateStore } from "src/stores/view-state-store";

export function findAbove(id: string, store: OutlineStore) {
  const outline = store.getOutline(id);
  if (!outline?.parentId) return;
  const siblings = store.getOutlineChildren(outline.parentId);
  if (!siblings) return;
  const { found, index } = siblings.findIndex(outline) ?? {};
  if (found && index !== 0) {
    const { id: prevId } = siblings.at(index - 1) ?? {};
    if (prevId) {
      const prev = store.getOutline(prevId);

      return prev ? (prev.collapsed ? prev.id : findAboveInner(prev?.id, store)) : undefined;
    } else {
      return undefined;
    }
  } else {
    return outline.parentId;
  }
}

function findAboveInner(id: string, store: OutlineStore) {
  const children = store.getOutlineChildren(id);
  if (children) {
    const { id: tailId } = children.at(-1) ?? {};
    if (tailId) {
      const tail = store.getOutline(tailId);
      if (!tail) return id;
      if (tail.collapsed) {
        return tail.id;
      } else {
        return findAboveInner(tail.id, store);
      }
    } else {
      return id;
    }
  } else {
    return id;
  }
}

export function findBelow(
  outlineId: string,
  store: OutlineStore,
  viewStateStore: ViewStateStore,
): string | undefined {
  const outline = store.getOutline(outlineId);
  const children = store.getOutlineChildren(outlineId);

  if (
    children &&
    children.size > 0 &&
    (outlineId === viewStateStore.getState().id || (outline && !outline.collapsed))
  )
    return children.at(0)?.id;

  if (!outline?.parentId) return;
  const siblings = store.getOutlineChildren(outline.parentId);
  if (!siblings) return outline.parentId;
  const { found, index } = siblings.findIndex(outline);

  if (found && siblings.size === index + 1) {
    return findBelowInner(outline.parentId, store);
  } else if (found) {
    return siblings.at(index + 1)?.id;
  } else {
    return;
  }
}

function findBelowInner(parentId: string, store: OutlineStore): string | undefined {
  const parent = store.getOutline(parentId);
  if (!parent?.parentId) return;
  const siblings = store.getOutlineChildren(parent.parentId);
  if (!siblings) return;
  const { index } = siblings.findIndex(parent);
  if (siblings.size > index + 1) {
    return siblings.at(index + 1)?.id;
  } else {
    return parent.parentId ? findBelowInner(parent.parentId, store) : undefined;
  }
}
