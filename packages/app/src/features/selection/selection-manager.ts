type YRange = {
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

  // Item registry
  #itemRanges = new Map<string, YRange>();
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
    this.#itemRanges.set(id, {
      top: element.offsetTop,
      bottom: element.offsetTop + element.offsetHeight,
    });
  }

  unregisterItem(id: string): void {
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

  // ============================================================================
  // Selection Logic
  // ============================================================================

  #updateSelection(): void {
    if (!this.#selectionRange) return;

    const newSelectedIds = new Set<string>();

    for (const [id, range] of this.#itemRanges) {
      const isAnchor = id === this.#anchorId;

      // For anchor element: don't apply threshold
      // For other elements: apply threshold to shrink effective area
      const effectiveTop = isAnchor ? range.top : range.top + this.#threshold;
      const effectiveBottom = isAnchor ? range.bottom : range.bottom - this.#threshold;

      // Check intersection
      const intersects =
        this.#selectionRange.top < effectiveBottom && this.#selectionRange.bottom > effectiveTop;

      // For anchor element: don't select until cursor has left, deselect when cursor returns
      if (isAnchor) {
        if (!this.#hasLeftAnchor || this.#isInsideAnchor) {
          continue;
        }
      }

      if (intersects) {
        newSelectedIds.add(id);
      }
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
    const mouseY = this.#getRelativeY(clientY);
    const range = this.#itemRanges.get(id);

    this.#anchorRange = range ?? null;
    this.#anchorId = id;
    this.#hasLeftAnchor = false;
    this.#isInsideAnchor = true;
    this.#selectionRange = { top: mouseY, bottom: mouseY };
    this.#isDragging = true;
    this.#setSelectedIds(new Set());
  }

  moveDrag(clientY: number): void {
    if (!this.#isDragging) return;

    const mouseY = this.#getRelativeY(clientY);
    const anchorRange = this.#anchorRange;

    // Update selection range
    if (this.#selectionRange) {
      const originalAnchorY = anchorRange
        ? mouseY < anchorRange.top
          ? anchorRange.bottom
          : anchorRange.top
        : this.#selectionRange.top;

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

  listenToSelectionChange = (id: string, listener: Listener): (() => void) => {
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
  };
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}
