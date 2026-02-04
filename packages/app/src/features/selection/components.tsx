/** biome-ignore-all lint/a11y/noStaticElementInteractions: these components needs mouse observation */
import type React from "react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { SelectionManager } from "./selection-manager";

const SelectionContext = createContext<SelectionManager | null>(null);

function useSelectionManager() {
  const manager = useContext(SelectionContext);

  if (!manager) {
    throw new Error("Selection.Item must be used within a Selection.Area");
  }

  return manager;
}

type SelectionAreaProps = {
  children: ReactNode;
  threshold?: number;
};

function SelectionArea({ children, threshold = 16 }: SelectionAreaProps) {
  const manager = useMemo(() => new SelectionManager(threshold), [threshold]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync container element with manager
  useLayoutEffect(() => {
    manager.setContainerElement(containerRef.current);
  }, [manager]);

  // Document-level mouse event listeners
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      manager.moveDrag(event.clientY);
    };

    const handleMouseUp = () => {
      manager.endDrag();
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [manager]);

  // Clear selection when clicking on container background
  const handleContainerMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        manager.clearSelection();
      }
    },
    [manager],
  );

  return (
    <SelectionContext.Provider value={manager}>
      <div
        ref={containerRef}
        style={{ position: "relative" }}
        onMouseDown={handleContainerMouseDown}
      >
        {children}
      </div>
    </SelectionContext.Provider>
  );
}

type SelectionGroupProps = {
  id: string;
  children: ReactNode | ((props: { isSelected: boolean }) => ReactNode);
};

function SelectionGroup({ id, children }: SelectionGroupProps) {
  const manager = useSelectionManager();

  // Subscribe to selection state for this specific id
  const isSelected = useSyncExternalStore(
    useCallback((listener) => manager.listenToSelectionChange(id, listener), [manager, id]),
    () => manager.selectedIds.has(id),
  );

  return <>{typeof children === "function" ? children({ isSelected }) : children}</>;
}

type SelectionItemProps = {
  id: string;
  children: ReactNode;
};

function SelectionItem({ id, children }: SelectionItemProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const manager = useSelectionManager();

  // Register element on mount (using offsetTop for scroll-independent positioning)
  useLayoutEffect(() => {
    if (elementRef.current) {
      manager.registerItem(id, elementRef.current);
    }
    return () => {
      manager.unregisterItem(id);
    };
  }, [id, manager]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      manager.startDrag(id, event.clientY);
    },
    [id, manager],
  );

  return (
    <div ref={elementRef} onMouseDown={onMouseDown}>
      {children}
    </div>
  );
}

/**
 * @package
 */
export const Selection = {
  Area: SelectionArea,
  Group: SelectionGroup,
  Item: SelectionItem,
};
