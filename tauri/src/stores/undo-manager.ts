import { OutlineStore } from "./outline-store";

type HistoryItem = {
  id: string;
  unsubscribers: Array<() => void>;
};

export class UndoManager {
  #outlineStore: OutlineStore;
  #undoStack: HistoryItem[] = [];
  #redoStack: HistoryItem[] = [];

  constructor(store: OutlineStore) {
    this.#outlineStore = store;
  }

  addHistory(id: string) {
    const unsubscribers = [this.#outlineStore.subscribeToOutline(id, () => {})];
    this.#undoStack.push({ id, unsubscribers });
    if (0 < this.#redoStack.length) this.#redoStack = [];
  }

  undo() {
    const history = this.#undoStack.pop();
    if (history) {
      this.#redoStack.push(history);
      this.#outlineStore.getYUndoManager(history.id)?.undo();

      while (this.#undoStack.length > 100) {
        const history = this.#undoStack.shift();
        history?.unsubscribers.forEach((fn) => fn());
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
