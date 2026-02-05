type YRange = {
  top: number;
  bottom: number;
};

type SortedItem = {
  id: string;
  top: number;
  bottom: number;
};

type Listener = () => void;

/**
 * @package
 */
export class SelectionManager {
  // Selection state
  #selectedIds = new Set<string>();
  #isDragging = false;
  #anchorId: string | null = null;
  #lastClickedId: string | null = null;
  #hasLeftAnchor = false;
  #isInsideAnchor = false;
  #selectionRange: YRange | null = null;
  #lastClientY: number | null = null;

  // Item registry
  #itemElements = new Map<string, HTMLElement>();
  #itemRanges = new Map<string, YRange>();
  #groupElements = new Map<string, HTMLElement>();
  #groupRanges = new Map<string, YRange>();
  #sortedItems: SortedItem[] = [];
  #maxItemHeight = 0;
  #anchorRange: YRange | null = null;

  // Configuration
  #threshold: number;
  #containerElement: HTMLElement | null = null;

  // Listeners
  #listeners = new Map<string, Set<Listener>>();

  constructor(threshold: number) {
    this.#threshold = threshold;
  }

  // ============================================================================
  // Getters
  // ============================================================================

  get selectedIds() {
    return this.#selectedIds;
  }

  // ============================================================================
  // Container & Item Registration
  // ============================================================================

  setContainerElement(element: HTMLElement | null): void {
    this.#containerElement = element;
  }

  registerItem(id: string, element: HTMLElement): void {
    this.#itemElements.set(id, element);
  }

  unregisterItem(id: string): void {
    this.#itemElements.delete(id);
    this.#itemRanges.delete(id);
  }

  registerGroup(id: string, element: HTMLElement): void {
    this.#groupElements.set(id, element);
  }

  unregisterGroup(id: string): void {
    this.#groupElements.delete(id);
    this.#groupRanges.delete(id);
  }

  // ============================================================================
  // Coordinate Calculation
  // ============================================================================

  #getRelativeY(clientY: number): number {
    const container = this.#containerElement;
    if (!container) return clientY;
    const containerRect = container.getBoundingClientRect();
    return clientY - containerRect.top + container.scrollTop;
  }

  #refreshItemRanges(): void {
    const container = this.#containerElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const items: SortedItem[] = [];
    let maxHeight = 0;

    for (const [id, element] of this.#itemElements) {
      const elementRect = element.getBoundingClientRect();
      // Convert to container-relative coordinates (accounting for scroll)
      const top = elementRect.top - containerRect.top + container.scrollTop;
      const bottom = top + elementRect.height;
      this.#itemRanges.set(id, { top, bottom });

      items.push({ id, top, bottom });
      const height = bottom - top;
      if (height > maxHeight) maxHeight = height;
    }

    // Also refresh group ranges
    for (const [id, element] of this.#groupElements) {
      const elementRect = element.getBoundingClientRect();
      const top = elementRect.top - containerRect.top + container.scrollTop;
      const bottom = top + elementRect.height;
      this.#groupRanges.set(id, { top, bottom });
    }

    // Sort by top coordinate for binary search
    items.sort((a, b) => a.top - b.top);
    this.#sortedItems = items;
    this.#maxItemHeight = maxHeight;
  }

  // ============================================================================
  // Selection Logic
  // ============================================================================

  /**
   * Binary search to find the first index where item.top >= target
   */
  #lowerBoundByTop(target: number): number {
    const items = this.#sortedItems;
    let left = 0;
    let right = items.length;
    while (left < right) {
      const mid = (left + right) >> 1;
      // biome-ignore lint/style/noNonNullAssertion: mid is always within bounds
      if (items[mid]!.top >= target) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }
    return left;
  }

  #updateSelection(): void {
    if (!this.#selectionRange) return;

    const newSelectedIds = new Set<string>();
    const { top: selTop, bottom: selBottom } = this.#selectionRange;

    // Use binary search to narrow down the range of items to check
    // Item intersects if: top < selBottom AND bottom > selTop
    // bottom > selTop => top + height > selTop => top > selTop - height
    // We use maxItemHeight as an upper bound for height
    const startIndex = this.#lowerBoundByTop(selTop - this.#maxItemHeight);
    const stopIndex = this.#lowerBoundByTop(selBottom);
    const items = this.#sortedItems;

    for (let i = startIndex; i < stopIndex; i++) {
      // biome-ignore lint/style/noNonNullAssertion: i is within [startIndex, stopIndex) bounds
      const item = items[i]!;
      const isAnchor = item.id === this.#anchorId;

      // For anchor element: don't apply threshold
      // For other elements: apply threshold to shrink effective area
      const effectiveTop = isAnchor ? item.top : item.top + this.#threshold;
      const effectiveBottom = isAnchor ? item.bottom : item.bottom - this.#threshold;

      // Check intersection
      const intersects = selTop < effectiveBottom && selBottom > effectiveTop;

      if (!intersects) continue;

      // For anchor element: don't select until cursor has left, deselect when cursor returns
      if (isAnchor && (!this.#hasLeftAnchor || this.#isInsideAnchor)) {
        continue;
      }

      newSelectedIds.add(item.id);
    }

    // Only update if changed
    if (!setsEqual(this.#selectedIds, newSelectedIds)) {
      this.#setSelectedIds(newSelectedIds);
    }
  }

  // ============================================================================
  // Drag Operations
  // ============================================================================

  startDrag(id: string, clientY: number): void {
    this.#refreshItemRanges();

    const mouseY = this.#getRelativeY(clientY);
    const range = this.#itemRanges.get(id);

    this.#anchorRange = range ?? null;
    this.#anchorId = id;
    this.#lastClickedId = id;
    this.#hasLeftAnchor = false;
    this.#isInsideAnchor = true;
    this.#selectionRange = { top: mouseY, bottom: mouseY };
    this.#isDragging = true;
    this.#lastClientY = clientY;
    this.#setSelectedIds(new Set());
  }

  moveDrag(clientY: number): void {
    if (!this.#isDragging) return;
    this.#lastClientY = clientY;
    this.recalculate();
  }

  recalculate(): void {
    if (!this.#isDragging || this.#lastClientY === null) return;

    const mouseY = this.#getRelativeY(this.#lastClientY);
    const anchorRange = this.#anchorRange;

    // Update selection range
    if (anchorRange) {
      const originalAnchorY = mouseY < anchorRange.top ? anchorRange.bottom : anchorRange.top;
      this.#selectionRange = {
        top: Math.min(originalAnchorY, mouseY),
        bottom: Math.max(originalAnchorY, mouseY),
      };
    }

    // Check if cursor has left anchor element
    if (!this.#hasLeftAnchor && anchorRange) {
      if (mouseY < anchorRange.top || mouseY > anchorRange.bottom) {
        this.#hasLeftAnchor = true;
      }
    }

    // Check if cursor is inside anchor
    if (anchorRange) {
      const isInside = mouseY >= anchorRange.top && mouseY <= anchorRange.bottom;
      if (this.#isInsideAnchor !== isInside) {
        this.#isInsideAnchor = isInside;
      }
    }

    this.#updateSelection();
  }

  endDrag(): void {
    this.#isDragging = false;
    this.#selectionRange = null;
    this.#anchorRange = null;
    this.#lastClientY = null;
  }

  // ============================================================================
  // Click Operations (for Shift+Click range selection)
  // ============================================================================

  selectRangeTo(id: string): void {
    if (this.#lastClickedId !== null) {
      this.#selectRange(this.#lastClickedId, id);
    } else {
      this.#lastClickedId = id;
      this.#setSelectedIds(new Set([id]));
    }
  }

  #selectRange(fromId: string, toId: string): void {
    this.#refreshItemRanges();

    const fromRange = this.#itemRanges.get(fromId);
    const toRange = this.#itemRanges.get(toId);
    if (!fromRange || !toRange) return;

    const rangeTop = Math.min(fromRange.top, toRange.top);
    const rangeBottom = Math.max(fromRange.bottom, toRange.bottom);

    const startIndex = this.#lowerBoundByTop(rangeTop - this.#maxItemHeight);
    const stopIndex = this.#lowerBoundByTop(rangeBottom);

    const items = this.#sortedItems;
    const newSelectedIds = new Set<string>();

    for (let i = startIndex; i < stopIndex; i++) {
      // biome-ignore lint/style/noNonNullAssertion: i is within [startIndex, stopIndex) bounds
      const item = items[i]!;
      if (item.top < rangeBottom && item.bottom > rangeTop) {
        newSelectedIds.add(item.id);
      }
    }

    this.#setSelectedIds(newSelectedIds);
  }

  toggleSelection(id: string): void {
    this.#refreshItemRanges();
    this.#lastClickedId = id;

    const itemRange = this.#itemRanges.get(id);
    if (!itemRange) return;

    const newSelectedIds = new Set(this.#selectedIds);

    // Check if any selected group contains this item
    for (const selectedId of this.#selectedIds) {
      const groupRange = this.#groupRanges.get(selectedId);
      if (!groupRange) continue;

      // Check if the clicked item is inside this selected group
      const isContained = itemRange.top >= groupRange.top && itemRange.bottom <= groupRange.bottom;
      if (isContained) {
        // Deselect all items within this group's range
        for (const item of this.#sortedItems) {
          if (item.top >= groupRange.top && item.bottom <= groupRange.bottom) {
            newSelectedIds.delete(item.id);
          }
        }
        this.#setSelectedIds(newSelectedIds);
        return;
      }
    }

    // No containing selected group found, just toggle the single item
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    this.#setSelectedIds(newSelectedIds);
  }

  getTopLevelSelectedIds(): Set<string> {
    this.#refreshItemRanges();

    // Sort selected items by top coordinate
    const selectedItems: SortedItem[] = [];
    for (const id of this.#selectedIds) {
      const range = this.#itemRanges.get(id);
      if (range) {
        selectedItems.push({ id, top: range.top, bottom: range.bottom });
      }
    }
    selectedItems.sort((a, b) => a.top - b.top);

    const result = new Set<string>();
    let skipBoundary = -Infinity;

    for (const item of selectedItems) {
      if (item.top >= skipBoundary) {
        // This item is outside the previous group, so it's top-level
        result.add(item.id);

        // Update skip boundary to this group's bottom
        const groupRange = this.#groupRanges.get(item.id);
        if (groupRange) {
          skipBoundary = groupRange.bottom;
        }
      }
    }

    return result;
  }

  clearSelection(): void {
    this.#setSelectedIds(new Set());
  }

  // ============================================================================
  // Internal State Setters
  // ============================================================================

  #setSelectedIds(newSelectedIds: Set<string>): void {
    const prevSelectedIds = this.#selectedIds;
    this.#selectedIds = newSelectedIds;

    const changedIds = symmetricDifference(prevSelectedIds, newSelectedIds);

    // Notify id-specific listeners
    for (const id of changedIds) {
      const listenerSet = this.#listeners.get(id);
      if (listenerSet) {
        for (const listener of listenerSet) {
          listener();
        }
      }
    }
  }

  listenToSelectionChange(id: string, listener: Listener): () => void {
    let listenerSet = this.#listeners.get(id);
    if (!listenerSet) {
      listenerSet = new Set();
      this.#listeners.set(id, listenerSet);
    }
    listenerSet.add(listener);

    return () => {
      const listeners = this.#listeners.get(id);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.#listeners.delete(id);
        }
      }
    };
  }
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function symmetricDifference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const result = new Set<T>();
  for (const item of a) if (!b.has(item)) result.add(item);
  for (const item of b) if (!a.has(item)) result.add(item);
  return result;
}
