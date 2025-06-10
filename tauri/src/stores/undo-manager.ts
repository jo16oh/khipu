import { OutlineType } from "generated/tauri-commands";
import { getSchemaOf } from "src/editor/schema";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineStore } from "./outline-store";

type HistoryItem = {
  id: string;
  type: OutlineType;
  unsubscribers: Array<() => void>;
};

export class UndoManager {
  #outlineStore: OutlineStore;
  #notifier: DocUpdateNotifier;
  #undoStack: HistoryItem[] = [];
  #redoStack: HistoryItem[] = [];

  constructor(store: OutlineStore, notifier: DocUpdateNotifier) {
    this.#outlineStore = store;
    this.#notifier = notifier;
  }

  addHistory(id: string) {
    const outline = this.#outlineStore.getOutline(id);
    if (!outline) throw new Error("outline not found");
    const unsubscribers = [this.#outlineStore.subscribeToOutline(id, () => {})];
    this.#undoStack.push({ id, unsubscribers, type: outline.type });
    this.#redoStack = [];
    while (this.#undoStack.length > 100) {
      const history = this.#undoStack.shift();
      history?.unsubscribers.forEach((fn) => fn());
    }
  }

  undo() {
    const history = this.#undoStack.pop();
    if (history) {
      this.#redoStack.push(history);
      const undoManager = this.#outlineStore.getYUndoManager(history.id);
      if (undoManager) {
        undoManager.undo();
        const ydoc = this.#outlineStore.getYDoc(history.id);
        const yxml = ydoc.getXmlFragment("doc");
        const doc = yXmlFragmentToProseMirrorRootNode(yxml, getSchemaOf(history.type)).toJSON();
        this.#notifier.notify(history.id, doc);
      }
    }
  }

  redo() {
    const history = this.#redoStack.pop();
    if (history) {
      this.#undoStack.push(history);
      this.#outlineStore.getYUndoManager(history.id)?.redo();
    }
  }
}
