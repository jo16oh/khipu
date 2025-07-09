import { OutlineStore } from "src/stores/outline-store";
import { ViewStateStore } from "src/stores/view-state-store";

export function findAbove(id: string, store: OutlineStore) {
  const outline = store.getOutline(id);
  if (!outline?.parentId) return;

  const siblings = store.getOutlineChildren(outline.parentId);
  if (!siblings) return;

  const { found, index } = siblings.findIndex(outline) ?? {};
  if (!found) return outline.parentId;

  if (index === 0) return outline.parentId;

  const { id: aboveId } = siblings.at(index - 1) ?? {};
  if (!aboveId) return;

  const above = store.getOutline(aboveId);
  if (!above) return;

  return above.collapsed ? above.id : findAboveInner(above.id, store);
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

  const hasChildren = children && children.size > 0;
  const isExpanded = outlineId === viewStateStore.getState().id || (outline && !outline.collapsed);

  if (hasChildren && isExpanded) {
    return children.at(0)?.id;
  }

  if (!outline?.parentId) return;

  const siblings = store.getOutlineChildren(outline.parentId);
  if (!siblings) return outline.parentId;

  const { found, index } = siblings.findIndex(outline);
  if (!found) return;

  const isLastSibling = siblings.size === index + 1;
  if (isLastSibling) {
    return findBelowInner(outline.parentId, store);
  }

  return siblings.at(index + 1)?.id;
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
