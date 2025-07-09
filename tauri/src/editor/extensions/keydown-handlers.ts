import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Editor, Extension, JSONContent } from "@tiptap/react";
import { OutlineType } from "generated/tauri-commands";
import { FocusManager } from "src/stores/focus-manager";
import { OutlineStore } from "src/stores/outline-store";
import { ViewStateStore } from "src/stores/view-state-store";
import { getSchemaOf } from "../schema";
import { insertJSONContentsToYXMLFragment } from "../utils";

const REM = 16;

type Handler = (view: EditorView, event: KeyboardEvent, editor: Editor) => void;
type Handlers = { [key: string]: Handler };

export function createKeydownHandlersExtension(
  outlineId: string,
  type: OutlineType,
  store: OutlineStore,
  focusManager: FocusManager,
  viewStateStore: ViewStateStore,
) {
  const handlers = createHandlers(outlineId, type, store, focusManager, viewStateStore);

  return Extension.create({
    name: "KeydownHandlers",
    addProseMirrorPlugins() {
      const editor = this.editor;
      return [
        new Plugin({
          key: new PluginKey("KeydownHandlers"),
          props: {
            handleKeyDown(view, event) {
              handlers[event.key]?.(view, event, editor);
            },
          },
        }),
      ];
    },
  });
}

function createHandlers(
  outlineId: string,
  type: OutlineType,
  store: OutlineStore,
  focusManager: FocusManager,
  viewStateStore: ViewStateStore,
): Handlers {
  const common: Handlers = {
    Backspace: async (_, event, editor) => {
      if (editor.state.selection.from !== 1) return;
      if (event.isComposing || event.key === "Process") return;
      if (viewStateStore.getState().id === outlineId) return;

      if (editor.isEmpty) {
        const aboveOutlineId = findAbove(outlineId, store);
        if (aboveOutlineId) {
          store.reducer.delete(outlineId);
          focusManager.focus({ id: aboveOutlineId, position: "end" });
        }
      } else {
        const aboveOutlineId = findAbove(outlineId, store);
        const aboveOutline = aboveOutlineId && store.getOutline(aboveOutlineId);

        if (aboveOutline) {
          const docToInsert = editor.getJSON().content as JSONContent[];
          const docSize = editor.state.doc.content.size;
          const ydoc = await store.getYDoc(aboveOutlineId);
          const yxml = ydoc.getXmlFragment("doc");

          if (type === aboveOutline.type) {
            store.reducer.delete(outlineId);
            insertJSONContentsToYXMLFragment(docToInsert, getSchemaOf(type), yxml, ydoc, true);
            focusManager.focus({ id: aboveOutlineId, position: -docSize });
          }
        }
      }
    },
    ArrowUp: (view, event) => {
      if (outlineId === viewStateStore.getState().id) return;

      const editorRect = view.dom.getBoundingClientRect();
      const cursorRect = view.coordsAtPos(view.state.selection.from);

      if (cursorRect.top - editorRect.top < REM) {
        const above = findAbove(outlineId, store);

        if (above) {
          event.preventDefault();
          focusManager.focus({ id: above, position: "end" });
        }
      }
    },
    ArrowDown: (view, event) => {
      const editorRect = view.dom.getBoundingClientRect();
      const cursorRect = view.coordsAtPos(view.state.selection.from);

      if (editorRect.bottom - cursorRect.bottom < REM) {
        const below = findBelow(outlineId, store, viewStateStore);

        if (below) {
          event.preventDefault();
          focusManager.focus({ id: below, position: "end" });
        }
      }
    },
    Tab: (_, event) => {
      event.preventDefault();
      event.stopPropagation();

      if (outlineId === viewStateStore.getState().id) return;

      if (!event.shiftKey) {
        const outline = store.getOutline(outlineId);
        if (!outline || !outline.parentId) return;
        const children = store.getOutlineChildren(outline.parentId);
        if (!children) return;
        const { index, found } = children.findIndex(outline);
        if (!found || index <= 0) return;
        const { id: newParentId } = children.at(index - 1)!;
        if (!newParentId) return;
        store.reducer.move([outlineId], newParentId, "end");
      } else {
        const outline = store.getOutline(outlineId);
        if (!outline || !outline.parentId) return;
        const parent = store.getOutline(outline.parentId);
        if (!parent?.parentId) return;
        store.reducer.move([outlineId], parent.parentId, { after: parent });
      }
    },
  };

  switch (type) {
    case "heading":
      return {
        ...common,
        Enter: async (view, event, editor) => {
          if (event.isComposing || event.key === "Process") return;

          const start = view.state.selection.from;
          const end = view.state.doc.content.size;

          const rightContent: JSONContent[] = view.state.doc
            .slice(start, end)
            .toJSON()
            .content.map((node: JSONContent) => ({ type: "paragraph", content: node.content }));

          const doc: JSONContent = { type: "doc", content: rightContent };

          const childId = store.reducer.create("bullet", outlineId, "start", doc);

          editor.commands.blur();
          focusManager.focus({ id: childId, position: "start" });
        },
      };
    case "bullet":
      return {
        ...common,
        Enter: async (view, event, editor) => {
          if (event.isComposing || event.key === "Process") return;

          const start = view.state.selection.from;
          const end = view.state.doc.content.size;

          const rightContent: JSONContent[] = view.state.doc
            .slice(start, end)
            .toJSON()
            .content.map((node: JSONContent) => ({ type: "paragraph", content: node.content }));

          const doc: JSONContent = { type: "doc", content: rightContent };

          const outline = store.getOutline(outlineId);

          if (!outline?.parentId) return;

          const newOutlineId = store.reducer.create(
            "bullet",
            outline.parentId,
            { after: outline },
            doc,
          );

          editor.commands.blur();
          focusManager.focus({ id: newOutlineId, position: "start" });
        },
      };
    case "card":
      return {
        ...common,
      };
    case "code":
      return {
        ...common,
      };
  }
}

function findAbove(id: string, store: OutlineStore) {
  const outline = store.getOutline(id);
  if (!outline?.parentId) return;
  const siblings = store.getOutlineChildren(outline.parentId);
  if (!siblings) return;
  const { found, index } = siblings.findIndex(outline) ?? {};
  if (found && index !== 0) {
    const prev = siblings.at(index - 1);
    return prev ? findAboveInner(prev?.id, store) : undefined;
  } else {
    return outline.parentId;
  }
}

function findAboveInner(id: string, store: OutlineStore) {
  const children = store.getOutlineChildren(id);
  if (children) {
    const { id: tailId } = children.at(-1) ?? {};
    if (tailId) {
      const tail = store.getOutline(tailId);
      if (!tail) return id;
      if (tail.collapsed) {
        return tail.id;
      } else {
        return findAboveInner(tail.id, store);
      }
    } else {
      return id;
    }
  } else {
    return id;
  }
}

function findBelow(
  outlineId: string,
  store: OutlineStore,
  viewStateStore: ViewStateStore,
): string | undefined {
  const outline = store.getOutline(outlineId);
  const children = store.getOutlineChildren(outlineId);

  if (
    children &&
    children.size > 0 &&
    (outlineId === viewStateStore.getState().id || (outline && !outline.collapsed))
  )
    return children.at(0)?.id;

  if (!outline?.parentId) return;
  const siblings = store.getOutlineChildren(outline.parentId);
  if (!siblings) return outline.parentId;
  const { found, index } = siblings.findIndex(outline);

  if (found && siblings.size === index + 1) {
    return findBelowInner(outline.parentId, store);
  } else if (found) {
    return siblings.at(index + 1)?.id;
  } else {
    return;
  }
}

function findBelowInner(parentId: string, store: OutlineStore): string | undefined {
  const parent = store.getOutline(parentId);
  if (!parent?.parentId) return;
  const siblings = store.getOutlineChildren(parent.parentId);
  if (!siblings) return;
  const { index } = siblings.findIndex(parent);
  if (siblings.size > index + 1) {
    return siblings.at(index + 1)?.id;
  } else {
    return parent.parentId ? findBelowInner(parent.parentId, store) : undefined;
  }
}
