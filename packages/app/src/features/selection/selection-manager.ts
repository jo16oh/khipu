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
  #hasLeftAnchor = false;
  #isInsideAnchor = false;
  #selectionRange: YRange | null = null;
  #lastClientY: number | null = null;

  // Item registry
  #itemElements = new Map<string, HTMLElement>();
  #itemRanges = new Map<string, YRange>();
  #sortedItems: SortedItem[] = [];
  #maxItemHeight = 0;
  #anchorRange: YRange | null = null;

  // Configuration
  #threshold: number;
  #containerElement: HTMLElement | null = null;

  // Listeners
  #idListeners = new Map<string, Set<Listener>>();

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

  clearSelection(): void {
    this.#setSelectedIds(new Set());
  }

  // ============================================================================
  // Internal State Setters
  // ============================================================================

  #setSelectedIds(newSelectedIds: Set<string>): void {
    const prevSelectedIds = this.#selectedIds;
    this.#selectedIds = newSelectedIds;

    // Find ids whose selection state changed
    const changedIds = new Set<string>();
    for (const id of prevSelectedIds) {
      if (!newSelectedIds.has(id)) changedIds.add(id);
    }
    for (const id of newSelectedIds) {
      if (!prevSelectedIds.has(id)) changedIds.add(id);
    }

    // Notify id-specific listeners
    for (const id of changedIds) {
      const idListenerSet = this.#idListeners.get(id);
      if (idListenerSet) {
        for (const listener of idListenerSet) {
          listener();
        }
      }
    }
  }

  listenToSelectionChange(id: string, listener: Listener): () => void {
    let idListenerSet = this.#idListeners.get(id);
    if (!idListenerSet) {
      idListenerSet = new Set();
      this.#idListeners.set(id, idListenerSet);
    }
    idListenerSet.add(listener);

    return () => {
      const listeners = this.#idListeners.get(id);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.#idListeners.delete(id);
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
