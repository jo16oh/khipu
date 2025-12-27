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
import { FocusManager, useFocusManager } from "src/stores/focus-manager";
import { OutlineStore, useOutlineStore } from "src/stores/outline-store";
import {
  copyOutlinesIntoClipboard,
  getOutlinesFromClipboard,
  InsertionPoint,
  insertOutlineNode,
} from "src/utils/clipboard";
import { Key } from "ts-keycode-enum";

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
  private _store: OutlineStore;

  constructor(boundaries: Quantify<string | HTMLElement>, store: OutlineStore) {
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

    this._store = store;
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

  getSelectedIds() {
    const result: string[] = [];

    for (const id of this._selected) {
      const path = this._store.getOutlinePath(id);

      const isAnscestorSelected = (path ?? []).reduce(
        (prev, curr) => prev || this._selected.has(curr),
        false,
      );

      if (!isAnscestorSelected) {
        result.push(id);
      }
    }

    return result;
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

  clearSelection() {
    this._selected.clear();
    this._area.clearSelection();
  }

  destroy() {
    this._area.destroy();
    this._cleanup();
  }
}

const SelectionContext = createContext<SelectionManager | null>(null);

export function useSelectionManager() {
  const state = use(SelectionContext);
  if (!state) throw new Error("OutlineSelectionContext is not set");
  return state;
}

export function useSelectionState(id: string) {
  const selectionManager = useSelectionManager();

  const isSelected = selectionManager.isSelected(id);

  const shouldDisplayAsSelected = useSyncExternalStore(
    (cb) => selectionManager.subscribe(id, cb),
    () => {
      const isSelected = selectionManager.isSelected(id);
      const isOnly = isSelected && selectionManager.selectionSize === 1;
      const { meta, shift, alt, ctrl } = selectionManager.getCurrentModifiers();
      return isSelected && (isOnly ? meta || shift || alt || ctrl : true);
    },
  );

  return {
    isSelected,
    shouldDisplayAsSelected,
    selectionManager,
  };
}

export function SelectionArea({
  boundaries,
  children,
}: PropsWithChildren<{ boundaries: Quantify<string | HTMLElement> }>) {
  const store = useOutlineStore();
  const focusManager = useFocusManager();
  const selectionManagerRef = useRef<SelectionManager | null>(null);

  if (selectionManagerRef.current === null) {
    selectionManagerRef.current = new SelectionManager(boundaries, store);
  }

  useEffect(() => {
    const manager = selectionManagerRef.current;

    return () => {
      selectionManagerRef.current = null;
      manager?.destroy();
    };
  }, [focusManager, store]);

  return (
    <SelectionContext value={selectionManagerRef.current}>
      <div onKeyDown={(e) => keydownHandler(e, selectionManagerRef.current!, focusManager, store)}>
        {children}
      </div>
    </SelectionContext>
  );
}

export function SelectableItem({
  id,
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"div"> & { id: string }) {
  const { shouldDisplayAsSelected } = useSelectionState(id);

  return (
    <div
      className={`selection-item ${selectionItemStyle} ${className ?? ""}`}
      data-id={id}
      data-selected={shouldDisplayAsSelected}
      {...rest}
    >
      {children}
    </div>
  );
}

async function keydownHandler(
  e: KeyboardEvent,
  selectionManager: SelectionManager,
  focusManager: FocusManager,
  store: OutlineStore,
) {
  const mods = selectionManager?.getCurrentModifiers();
  const selectionSize = selectionManager?.selectionSize ?? 0;
  const isSelected =
    selectionSize > 1 ||
    (selectionSize === 1 && (mods?.alt || mods?.ctrl || mods?.meta || mods?.shift));

  if (e.keyCode === Key.V && (e.metaKey || e.ctrlKey)) {
    const tree = await getOutlinesFromClipboard();
    if (tree) {
      if (isSelected) {
        // selectionがある場合は、置き換え
        // const selectedIds = selectionManager?.getSelectedIds();
        // if (!selectedIds) return;
        //
        // const insertionPoint = findInsertionPoint(selectedIds, store);
        // if (!insertionPoint) return;
        // store.reducer.delete(...selectedIds);
        // await insertOutlineNode(tree, insertionPoint, store);
      } else {
        const insertionPoint = (() => {
          const id = focusManager.current()?.id;
          if (!id) return null;
          const outline = store.getOutline(id);
          if (!outline) return null;
          return { parentId: outline.parentId, position: { after: outline } };
        })();

        if (!insertionPoint) return;

        insertOutlineNode(tree, insertionPoint, store);
      }
    }
  }

  if (!isSelected) return;

  if (e.keyCode === Key.X && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    e.stopPropagation();

    const selectedIds = selectionManager?.getSelectedIds();
    if (!selectedIds) return;
    await copyOutlinesIntoClipboard(selectedIds, store);
    store.reducer.delete(...selectedIds);
  } else if (e.keyCode === Key.C && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    e.stopPropagation();

    const selectedIds = selectionManager?.getSelectedIds();
    if (!selectedIds) return;
    await copyOutlinesIntoClipboard(selectedIds, store);
  } else if (e.keyCode === Key.Backspace) {
    e.preventDefault();
    e.stopPropagation();

    const selectedIds = selectionManager?.getSelectedIds();
    if (!selectedIds) return;
    store.reducer.delete(...selectedIds);
    for (const id of selectedIds) {
      await store.save(id);
    }
  } else if (
    e.keyCode !== Key.Ctrl &&
    e.keyCode !== Key.LeftWindowKey &&
    e.keyCode !== Key.RightWindowKey &&
    e.keyCode !== Key.Shift &&
    e.keyCode !== Key.Alt
  ) {
    selectionManager.clearSelection();
  }

  return;
}

// function findInsertionPoint(
//   selectedIds: Array<string>,
//   store: OutlineStore,
// ): InsertionPoint | null {
//   const sortedIds = Array.from(selectedIds).toSorted((idA, idB) => {
//     const pathA = [...(store.getOutlinePath(idA) ?? []), idA];
//     const pathB = [...(store.getOutlinePath(idB) ?? []), idB];
//
//     const fullFindexA = pathA.reduce((prev, id) => prev + (store.getOutline(id)?.findex ?? ""), "");
//     const fullFindexB = pathB.reduce((prev, id) => prev + (store.getOutline(id)?.findex ?? ""), "");
//
//     return fullFindexA.localeCompare(fullFindexB);
//   });
//
//   const topId = sortedIds[0];
//   if (!topId) return null;
//   const outline = store.getOutline(topId);
//   if (!outline || !outline.parentId) return null;
//   const siblings = store.getOutlineChildren(outline.parentId);
//   if (!siblings) return null;
//   const { found, index } = siblings.findIndex(outline);
//   if (!found) return null;
//   if (index === 0) return { parentId: outline.parentId, position: "start" };
//   const above = store.getOutline(siblings.at(index - 1)!.id);
//   if (!above) return null;
//   return { parentId: outline.parentId, position: { after: above } };
// }

const selectionItemStyle = css({
  "&[data-selected='true']": {
    bg: "blue.200",
  },
});
