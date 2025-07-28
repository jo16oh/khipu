import Viselect, { Quantify, SelectionEvent } from "@viselect/vanilla";
import { css } from "generated/styled-system/css";
import {
  ComponentPropsWithoutRef,
  createContext,
  PropsWithChildren,
  use,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

type Modifiers = { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean };

class SelectionManager {
  private _selected: Set<string> = new Set();
  private _listeners: Map<string, () => void> = new Map();
  private _area: Viselect;
  private _startModifiers: Modifiers = {
    alt: false,
    ctrl: false,
    meta: false,
    shift: false,
  };
  private _cleanup: () => void;

  constructor(boundaries: Quantify<string | HTMLElement>) {
    this._area = new Viselect({
      boundaries,
      selectables: ".selection-item",
      behaviour: {
        scrolling: {
          // for Safari
          startScrollMargins: { x: 20, y: 20 },
        },
      },
    })
      .on("start", (e) => e?.event && this._setModifiers(e.event))
      .on("start", (e) => this._syncSelection(e))
      .on("move", (e) => this._syncSelection(e));

    const mousedown = (e: MouseEvent) => this._clearSelection(e);
    const mouseup = (e: MouseEvent) => this._onMouseUp(e);
    window.addEventListener("mousedown", mousedown);
    window.addEventListener("mouseup", mouseup);
    this._cleanup = () => {
      window.removeEventListener("mousedown", mousedown);
      window.removeEventListener("mouseup", mouseup);
    };
  }

  private _syncSelection(e: SelectionEvent) {
    const {
      store: {
        changed: { added, removed },
      },
    } = e;

    for (const elem of added as HTMLElement[]) {
      const id = elem.dataset["id"];
      if (id) this._selected.add(id);
    }

    for (const elem of removed as HTMLElement[]) {
      const id = elem.dataset["id"];
      if (id) this._selected.delete(id);
    }

    this._notify();
  }

  private _clearSelection(e: MouseEvent) {
    const target = e.target as Element;
    const isModifierKeyPressed = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

    const shouldClear =
      !target.closest(".scroll-area") || !isModifierKeyPressed || target.closest(".view-root");

    if (shouldClear) {
      this._performClearSelection();
    }
  }

  private _performClearSelection() {
    this._selected.clear();
    this._area?.clearSelection(true, true);
    this._notify();
  }

  private _onMouseUp(e: MouseEvent) {
    if (this._selected.size === 1 && !e.metaKey && !e.shiftKey && !e.altKey && !e.ctrlKey) {
      this._clearSelection(e);
      // @ts-expect-error using internal
      this._area._latestElement = undefined;
    }
  }

  private _setModifiers(e: MouseEvent | TouchEvent) {
    this._startModifiers.alt = e.altKey;
    this._startModifiers.ctrl = e.ctrlKey;
    this._startModifiers.meta = e.metaKey;
    this._startModifiers.shift = e.shiftKey;
  }

  private _notify() {
    for (const fn of this._listeners.values()) {
      fn();
    }
  }

  getCurrentModifiers(): Readonly<Modifiers> {
    return this._startModifiers;
  }

  getAllSelectedItems() {
    return Array.from(this._selected);
  }

  addItem(id: string) {
    this._selected.add(id);
    this._notify();
  }

  removeItem(id: string) {
    this._selected.delete(id);
    this._notify();
  }

  subscribe(id: string, cb: () => void) {
    this._listeners.set(id, cb);
    return () => {
      this._listeners.delete(id);
    };
  }

  isSelected(id: string) {
    return this._selected.has(id);
  }

  get selectionSize() {
    return this._selected.size;
  }

  destroy() {
    this._area.destroy();
    this._cleanup();
  }
}

const OutlineSelectionContext = createContext<SelectionManager | null>(null);

function useSelectionManager() {
  const state = use(OutlineSelectionContext);
  if (!state) throw new Error("OutlineSelectionContext is not set");
  return state;
}

export function SelectionArea({
  boundaries,
  children,
}: PropsWithChildren<{ boundaries: Quantify<string | HTMLElement> }>) {
  const selectionManager = useRef<SelectionManager | null>(null);

  if (selectionManager.current === null) {
    selectionManager.current = new SelectionManager(boundaries);
  }

  useEffect(() => {
    const manager = selectionManager.current;
    return () => {
      selectionManager.current = null;
      manager?.destroy();
    };
  }, []);

  return (
    <OutlineSelectionContext value={selectionManager.current}>{children}</OutlineSelectionContext>
  );
}

export function SelectableContainer({
  id,
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"div"> & { id: string }) {
  const selectionManager = useSelectionManager();

  const displayAsSelected = useSyncExternalStore(
    (cb) => selectionManager.subscribe(id, cb),
    () => {
      const isSelected = selectionManager.isSelected(id);
      const isOnly = isSelected && selectionManager.selectionSize === 1;
      const { meta, shift, alt, ctrl } = selectionManager.getCurrentModifiers();
      return isSelected && (isOnly ? meta || shift || alt || ctrl : true);
    },
  );

  return (
    <div
      className={`selection-item ${selectionItemStyle} ${className ?? ""}`}
      data-id={id}
      data-selected={displayAsSelected}
      {...rest}
    >
      {children}
    </div>
  );
}

const selectionItemStyle = css({
  "&[data-selected='true']": {
    bg: "blue.200",
  },
});
