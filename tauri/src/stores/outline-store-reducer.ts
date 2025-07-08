import type { JSONContent } from "@tiptap/react";
import { generateKeyBetween } from "fractional-indexing-jittered";
import { OutlineType } from "generated/tauri-commands";
import { getSchemaOf } from "src/editor/schema";
import { Outline } from "src/model";
import { uuidv7bs58 } from "src/utils";
import { prosemirrorJSONToYXmlFragment } from "y-prosemirror";
import * as Y from "yjs";
import { OutlineChildrenStore } from "./outline-children-store";
import { OutlineStoreUpdater, RegisterToStore } from "./outline-store";
import { UndoManager } from "./undo-manager";

type Id = string;

export class OutlineStoreReducer {
  #registerToStore: RegisterToStore;
  #createNewYdoc: (id: string) => Y.Doc;
  #ydocs: Map<string, Promise<Y.Doc>>;
  #undoManager: UndoManager;
  #childrenStore: OutlineChildrenStore;
  #updateOutline: OutlineStoreUpdater;

  constructor(
    registerToStore: RegisterToStore,
    ydocs: Map<string, Promise<Y.Doc>>,
    createNewYdoc: (id: string) => Y.Doc,
    undoManager: UndoManager,
    childrenStore: OutlineChildrenStore,
    updateOutline: OutlineStoreUpdater,
  ) {
    this.#registerToStore = registerToStore;
    this.#ydocs = ydocs;
    this.#createNewYdoc = createNewYdoc;
    this.#undoManager = undoManager;
    this.#childrenStore = childrenStore;
    this.#updateOutline = updateOutline;
  }

  create(
    type: OutlineType,
    parentId: string | null = null,
    position: "start" | "end" | { after: Outline } = "start",
    doc: JSONContent = { type: "doc", content: [] },
  ) {
    const findex = (() => {
      if (!parentId) return generateKeyBetween(null, null);
      const list = this.#childrenStore.get(parentId);
      if (list) return list.generateFractionalIndex(position);
      return generateKeyBetween(null, null);
    })();

    const now = new Date();

    const o: Outline = {
      id: uuidv7bs58(),
      parentId,
      doc: doc,
      type,
      findex,
      completed: false,
      collapsed: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.#registerToStore(o);

    const ydoc = this.#createNewYdoc(o.id);

    ydoc.transact(() => {
      const ymap = ydoc.getMap("props");
      const yxml = ydoc.getXmlFragment("doc");
      prosemirrorJSONToYXmlFragment(getSchemaOf(type), doc, yxml);
      ymap.set("parentId", o.parentId);
      ymap.set("type", o.type);
      ymap.set("findex", o.findex);
      ymap.set("completed", o.completed);
      ymap.set("collapsed", o.collapsed);
      ymap.set("deleted", o.deleted);
    });

    this.#ydocs.set(o.id, Promise.resolve(ydoc));

    return o.id;
  }

  move(outlineIds: Id[], to: Id | "root", position: "start" | "end" | { after: Outline }) {
    const parentId = to === "root" ? null : to;

    const findex = (() => {
      if (to === "root") return generateKeyBetween(null, null);
      const list = this.#childrenStore.get(to);
      if (!list) return generateKeyBetween(null, null);
      return list.generateFractionalIndex(position);
    })();

    for (const [i, id] of outlineIds.entries()) {
      this.#updateOutline(id, (draft) => {
        draft.parentId = parentId;
        draft.findex = findex + String(i);
      });
    }
  }

  convertType() {}

  toggleCompleted(...ids: string[]) {
    for (const id of ids) {
      this.#updateOutline(id, (draft) => {
        draft.completed = !draft.completed;
      });
    }
  }

  toggleCollapsed(...ids: string[]) {
    for (const id of ids) {
      this.#updateOutline(id, (draft) => {
        draft.collapsed = !draft.collapsed;
      });
    }
  }

  delete(...ids: string[]) {
    for (const id of ids) {
      this.#updateOutline(id, (draft) => {
        draft.deleted = true;
      });

      this.#childrenStore.delete(id);
    }
  }

  undo() {
    this.#undoManager.undo();
  }

  redo() {
    this.#undoManager.redo();
  }
}
