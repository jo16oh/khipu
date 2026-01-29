/** biome-ignore-all lint/a11y/noStaticElementInteractions: these components needs mouse observation */

import type React from "react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================================
// Types
// ============================================================================

interface SelectionRect {
  top: number;
  bottom: number;
}

interface SelectionContextValue {
  isDragging: boolean;
  selectionRect: SelectionRect | null;
  threshold: number;
  selectedIds: Set<string>;
  anchorId: string | null;
  hasLeftAnchor: boolean;
  isInsideAnchor: boolean;
  handleItemMouseDown: (id: string, event: React.MouseEvent, elementRect: DOMRect) => void;
  registerSelected: (id: string) => void;
  unregisterSelected: (id: string) => void;
}

interface SelectionAreaProps {
  children: ReactNode;
  threshold?: number;
  debug?: boolean;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

interface SelectionItemRenderProps {
  isSelected: boolean;
  isDragging: boolean;
  isAnchor: boolean;
}

interface SelectionItemProps {
  id: string;
  children: ReactNode | ((props: SelectionItemRenderProps) => ReactNode);
}

interface UseSelectionReturn {
  selectedIds: Set<string>;
  isDragging: boolean;
  anchorId: string | null;
}

// ============================================================================
// Context
// ============================================================================

const SelectionContext = createContext<SelectionContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

export function useSelection(): UseSelectionReturn {
  const context = useContext(SelectionContext);
  if (!context) {
    return {
      selectedIds: new Set(),
      isDragging: false,
      anchorId: null,
    };
  }
  return {
    selectedIds: context.selectedIds,
    isDragging: context.isDragging,
    anchorId: context.anchorId,
  };
}

// ============================================================================
// Selection.Area
// ============================================================================

function SelectionArea({
  children,
  threshold = 16,
  debug = false,
  onSelectionChange,
}: SelectionAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [anchorY, setAnchorY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState<number | null>(null);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [hasLeftAnchor, setHasLeftAnchor] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate selection rect
  const selectionRect = useMemo<SelectionRect | null>(() => {
    if (!isDragging || anchorY === null || currentY === null) {
      return null;
    }
    return {
      top: Math.min(anchorY, currentY),
      bottom: Math.max(anchorY, currentY),
    };
  }, [isDragging, anchorY, currentY]);

  // Handle mouse down on an item
  const handleItemMouseDown = useCallback(
    (id: string, event: React.MouseEvent, elementRect: DOMRect) => {
      if (event.button !== 0) return;

      const mouseY = event.clientY;
      setAnchorY(mouseY);
      setCurrentY(mouseY);
      setAnchorId(id);
      setAnchorRect(elementRect);
      setHasLeftAnchor(false);
      setIsDragging(true);
      setSelectedIds(new Set());
    },
    [],
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging) return;

      const mouseY = event.clientY;
      setCurrentY(mouseY);

      // Check if cursor has left anchor element
      if (!hasLeftAnchor && anchorRect) {
        if (mouseY < anchorRect.top || mouseY > anchorRect.bottom) {
          setHasLeftAnchor(true);
        }
      }
    },
    [isDragging, hasLeftAnchor, anchorRect],
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Check if cursor is currently inside anchor
  const isInsideAnchor = useMemo(() => {
    if (!isDragging || !anchorRect || currentY === null) return false;
    return currentY >= anchorRect.top && currentY <= anchorRect.bottom;
  }, [isDragging, anchorRect, currentY]);

  // Add global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    } else {
      return () => {};
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Notify selection changes
  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  // Clear selection when clicking on container
  const handleContainerMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setSelectedIds(new Set());
    }
  }, []);

  // Register/unregister selected items
  const registerSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unregisterSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const contextValue = useMemo<SelectionContextValue>(
    () => ({
      isDragging,
      selectionRect,
      threshold,
      selectedIds,
      anchorId,
      hasLeftAnchor,
      isInsideAnchor,
      handleItemMouseDown,
      registerSelected,
      unregisterSelected,
    }),
    [
      isDragging,
      selectionRect,
      threshold,
      selectedIds,
      anchorId,
      hasLeftAnchor,
      isInsideAnchor,
      handleItemMouseDown,
      registerSelected,
      unregisterSelected,
    ],
  );

  return (
    <SelectionContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        style={{ position: "relative" }}
        onMouseDown={handleContainerMouseDown}
      >
        {children}
        {/* Debug: visualize selection rect */}
        {debug && selectionRect && (
          <div
            style={{
              position: "fixed",
              left: 0,
              right: 0,
              top: selectionRect.top,
              height: selectionRect.bottom - selectionRect.top,
              backgroundColor: "rgba(255, 0, 0, 0.1)",
              border: "1px dashed red",
              pointerEvents: "none",
              zIndex: 9999,
            }}
          />
        )}
      </div>
    </SelectionContext.Provider>
  );
}

// ============================================================================
// Selection.Item
// ============================================================================

function SelectionItem({ id, children }: SelectionItemProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const context = useContext(SelectionContext);

  const isDragging = context?.isDragging ?? false;
  const selectionRect = context?.selectionRect ?? null;
  const threshold = context?.threshold ?? 16;
  const selectedIds = context?.selectedIds ?? new Set<string>();
  const anchorId = context?.anchorId ?? null;
  const hasLeftAnchor = context?.hasLeftAnchor ?? false;
  const isInsideAnchor = context?.isInsideAnchor ?? false;
  const handleItemMouseDown = context?.handleItemMouseDown;
  const registerSelected = context?.registerSelected;
  const unregisterSelected = context?.unregisterSelected;

  const isSelected = selectedIds.has(id);
  const isAnchor = anchorId === id;

  // Check intersection with selection rect
  useEffect(() => {
    if (!isDragging || !selectionRect || !elementRef.current) {
      return;
    }

    const rect = elementRef.current.getBoundingClientRect();

    // For anchor element: don't apply threshold, use full rect
    // For other elements: apply threshold to shrink effective area
    const effectiveTop = isAnchor ? rect.top : rect.top + threshold;
    const effectiveBottom = isAnchor ? rect.bottom : rect.bottom - threshold;

    // Check if selection rect intersects with the effective area
    const intersects = selectionRect.top < effectiveBottom && selectionRect.bottom > effectiveTop;

    // For anchor element:
    // - Don't select until cursor has left
    // - Deselect when cursor returns inside anchor
    if (isAnchor) {
      if (!hasLeftAnchor || isInsideAnchor) {
        unregisterSelected?.(id);
        return;
      }
    }

    if (intersects) {
      registerSelected?.(id);
    } else {
      unregisterSelected?.(id);
    }
  }, [
    isDragging,
    selectionRect,
    threshold,
    id,
    isAnchor,
    hasLeftAnchor,
    isInsideAnchor,
    registerSelected,
    unregisterSelected,
  ]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (handleItemMouseDown && elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        handleItemMouseDown(id, event, rect);
      }
    },
    [id, handleItemMouseDown],
  );

  return (
    <div
      ref={elementRef}
      style={{
        cursor: isDragging ? "default" : "text",
        userSelect: isDragging && hasLeftAnchor && !isInsideAnchor ? "none" : "text",
      }}
      onMouseDown={onMouseDown}
    >
      {typeof children === "function" ? children({ isSelected, isDragging, isAnchor }) : children}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export const Selection = {
  Area: SelectionArea,
  Item: SelectionItem,
};

export default Selection;
