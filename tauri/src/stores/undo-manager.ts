import { getSchemaOf } from "src/editor/schema";
import { OutlineType } from "src/model";
import { yXmlFragmentToProseMirrorRootNode } from "y-prosemirror";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineStore } from "./outline-store";
import { View } from "./view-state-store";
import { WorkspaceStateStore } from "./workspace-state-store";

type HistoryItem = {
  id: string;
  type: OutlineType;
  viewState: View;
  unsubscribers: Array<() => void>;
};

export class UndoManager {
  #outlineStore: OutlineStore;
  #workspaceStateStore: WorkspaceStateStore;
  #notifier: DocUpdateNotifier;
  #undoStack: HistoryItem[] = [];
  #redoStack: HistoryItem[] = [];

  constructor(
    store: OutlineStore,
    workspaceStateStore: WorkspaceStateStore,
    notifier: DocUpdateNotifier,
  ) {
    this.#outlineStore = store;
    this.#workspaceStateStore = workspaceStateStore;
    this.#notifier = notifier;
  }

  addHistory(id: string) {
    const outline = this.#outlineStore.getOutline(id);
    if (!outline) throw new Error("outline not found");
    const unsubscribers = [this.#outlineStore.subscribeToOutline(id, () => {})];

    const viewStateStore = (() => {
      const state = this.#workspaceStateStore.getState();
      return state.hover ? state.hover : state.stage;
    })();

    const viewState = (() => {
      const state = viewStateStore.getState();
      return { id: state.id, scrollPosition: state.currentScrollPosition() };
    })();

    this.#undoStack.push({ id, unsubscribers, type: outline.attrs.type, viewState });
    this.#redoStack = [];

    while (this.#undoStack.length > 100) {
      const history = this.#undoStack.shift();
      history?.unsubscribers.forEach((fn) => fn());
    }
  }

  async undo() {
    const history = this.#undoStack.pop();
    if (history) {
      this.#redoStack.push(history);
      const undoManager = this.#outlineStore.getYUndoManager(history.id);
      if (undoManager) {
        const viewStateStore = (() => {
          const state = this.#workspaceStateStore.getState();
          return state.hover ? state.hover : state.stage;
        })().getState();

        viewStateStore.jump(history.viewState);
        viewStateStore.focusManager.focus({ id: history.id, position: "end" });

        undoManager.undo();
        const ydoc = await this.#outlineStore.getYDoc(history.id);
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
