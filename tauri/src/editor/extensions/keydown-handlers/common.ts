import { EditorView } from "@tiptap/pm/view";
import { Editor, JSONContent } from "@tiptap/react";
import { OutlineType } from "generated/tauri-commands";
import { FocusManager } from "src/stores/focus-manager";
import { OutlineStore } from "src/stores/outline-store";
import { ViewStateStore } from "src/stores/view-state-store";
import { KeyboardEventHandler } from "src/utils/keyboard-event-handler";
import { Key } from "ts-keycode-enum";
import { getSchemaOf } from "../../schema";
import { insertJSONContentsToYXMLFragment } from "../../utils";
import { findAbove, findBelow } from "./utils";

const REM = 16;

export function createCommonKeydownHandlers(
  outlineId: string,
  type: OutlineType,
  store: OutlineStore,
  focusManager: FocusManager,
  viewStateStore: ViewStateStore,
): KeyboardEventHandler<[EditorView, Editor]>[] {
  return [
    {
      on: [Key.Backspace],
      fn: async (event, _, editor) => {
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
    },
    {
      on: [Key.UpArrow],
      fn: (event, view) => {
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
    },
    {
      on: [Key.DownArrow],
      fn: (event, view) => {
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
    },
    {
      on: [Key.Tab],
      fn: (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (outlineId === viewStateStore.getState().id) return;

        const outline = store.getOutline(outlineId);
        if (!outline || !outline.parentId) return;
        const children = store.getOutlineChildren(outline.parentId);
        if (!children) return;
        const { index, found } = children.findIndex(outline);
        if (!found || index <= 0) return;
        const { id: newParentId } = children.at(index - 1)!;
        if (!newParentId) return;
        store.reducer.move([outlineId], newParentId, "end");
      },
    },
    {
      on: [Key.Tab, ["shift"]],
      fn: (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (outlineId === viewStateStore.getState().id) return;

        const outline = store.getOutline(outlineId);
        if (!outline || !outline.parentId) return;
        const parent = store.getOutline(outline.parentId);
        if (!parent?.parentId) return;
        store.reducer.move([outlineId], parent.parentId, { after: parent });
      },
    },
    {
      on: [Key.UpArrow, ["meta"]],
      fn: () => {
        if (viewStateStore.getState().id === outlineId) return true;
        const outline = store.getOutline(outlineId);
        if (!outline || outline.collapsed) return true;

        const children = store.getOutlineChildren(outlineId);
        if (children && children.size) {
          store.reducer.collapse(outlineId);
        }

        return true;
      },
    },
    {
      on: [Key.DownArrow, ["meta"]],
      fn: () => {
        const children = store.getOutlineChildren(outlineId);
        if (children && children.size) {
          store.reducer.expand(outlineId);
        }
        if (viewStateStore.getState().id === outlineId) return true;
        const outline = store.getOutline(outlineId);
        if (!outline || !outline.collapsed) return true;
        return true;
      },
    },
  ];
}
