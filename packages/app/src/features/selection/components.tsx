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

/**
 * @public
 */
export function useSelectionManager() {
  const manager = useContext(SelectionContext);

  if (!manager) {
    throw new Error("Selection.Item must be used within a Selection.Area");
  }

  return manager;
}

type SelectionAreaProps = {
  threshold?: number;
} & React.ComponentPropsWithoutRef<"div">;

function SelectionArea({
  children,
  threshold = 16,
  style,
  onScroll,
  onMouseDown,
  ...restProps
}: SelectionAreaProps) {
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

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        manager.clearSelection();
      }
      onMouseDown?.(event);
    },
    [manager, onMouseDown],
  );

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      manager.recalculate();
      onScroll?.(event);
    },
    [manager, onScroll],
  );

  return (
    <SelectionContext.Provider value={manager}>
      <div
        ref={containerRef}
        style={{ position: "relative", ...style }}
        onMouseDown={handleMouseDown}
        onScroll={handleScroll}
        {...restProps}
      >
        {children}
      </div>
    </SelectionContext.Provider>
  );
}

type SelectionGroupProps = {
  id: string;
  children: ReactNode | ((props: { isSelected: boolean }) => ReactNode);
} & Omit<React.ComponentPropsWithoutRef<"div">, "children">;

function SelectionGroup({ id, children, ...restProps }: SelectionGroupProps) {
  const manager = useSelectionManager();
  const groupRef = useRef<HTMLDivElement>(null);

  // Register group element on mount
  useLayoutEffect(() => {
    if (groupRef.current) {
      manager.registerGroup(id, groupRef.current);
    }
    return () => {
      manager.unregisterGroup(id);
    };
  }, [id, manager]);

  // Subscribe to selection state for this specific id
  const isSelected = useSyncExternalStore(
    useCallback((listener) => manager.listenToSelectionChange(id, listener), [manager, id]),
    () => manager.isSelected(id),
  );

  return (
    <div ref={groupRef} {...restProps}>
      {typeof children === "function" ? children({ isSelected }) : children}
    </div>
  );
}

type SelectionItemProps = {
  id: string;
} & React.ComponentPropsWithoutRef<"div">;

function SelectionItem({ id, children, onMouseDown, ...restProps }: SelectionItemProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const manager = useSelectionManager();

  // Register element on mount
  useLayoutEffect(() => {
    if (elementRef.current) {
      manager.registerItem(id, elementRef.current);
    }
    return () => {
      manager.unregisterItem(id);
    };
  }, [id, manager]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.button === 0) {
        if (event.metaKey) {
          manager.toggleSelection(id);
        } else if (event.shiftKey) {
          manager.selectRangeTo(id);
        } else {
          manager.startDrag(id, event.clientY);
        }
      }
      onMouseDown?.(event);
    },
    [id, manager, onMouseDown],
  );

  return (
    <div ref={elementRef} onMouseDown={handleMouseDown} {...restProps}>
      {children}
    </div>
  );
}

/**
 * @public
 */
export const Selection = {
  Area: SelectionArea,
  Group: SelectionGroup,
  Item: SelectionItem,
};
