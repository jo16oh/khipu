import Collabolation from "@tiptap/extension-collaboration";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { Extensions, getSchema, JSONContent, Node } from "@tiptap/react";
import { OutlineType } from "generated/tauri-commands";
import { DocUpdateNotifier } from "src/stores/doc-update-notifier";
import { FocusManager } from "src/stores/focus-manager";
import { OutlineStore } from "src/stores/outline-store";
import { ViewStateStore } from "src/stores/view-state-store";
import * as Y from "yjs";
import { createKeydownHandlersExtension } from "./extensions/keydown-handlers";
import { createSyncFocusPositionExtension } from "./extensions/sync-focus-position";
import { createUpdateNotifierExtension } from "./extensions/update-notifier";

const SingleBlockDocument = Node.create({
  name: "doc",
  topNode: true,
  content: "block",
});

export function createRendererExtensions(type: OutlineType): Extensions {
  switch (type) {
    case "heading":
      return [SingleBlockDocument, Heading, Text];
    case "bullet":
      return [SingleBlockDocument, Paragraph, Text];
    case "card":
      return [Document, Paragraph, Text];
    case "code":
      return [Document, Paragraph, Text];
  }
}

export function createEditorExtensions(
  outlineId: string,
  ydoc: Y.Doc,
  type: OutlineType,
  store: OutlineStore,
  notifier: DocUpdateNotifier,
  focusManager: FocusManager,
  viewStateStore: ViewStateStore,
): Extensions {
  const fragment = ydoc.getXmlFragment("doc");

  return [
    ...createRendererExtensions(type),
    ...createKeydownHandlers(outlineId, type, store, focusManager, viewStateStore),
    Collabolation.extend().configure({ fragment }),
    createUpdateNotifierExtension(outlineId, notifier),
    createSyncFocusPositionExtension(outlineId, focusManager),
  ];
}

export function getSchemaOf(type: OutlineType) {
  switch (type) {
    case "heading":
      return getSchema([SingleBlockDocument, Paragraph, Text]);
    case "bullet":
      return getSchema([SingleBlockDocument, Paragraph, Text]);
    case "card":
      return getSchema([Document, Paragraph, Text]);
    case "code":
      return getSchema([Document, Paragraph, Text]);
  }
}

const REM = 16;

export function createKeydownHandlers(
  outlineId: string,
  type: OutlineType,
  store: OutlineStore,
  focusManager: FocusManager,
  viewStateStore: ViewStateStore,
) {
  const common: Parameters<typeof createKeydownHandlersExtension>[0] = {
    ArrowUp: (view, event) => {
      const editorRect = view.dom.getBoundingClientRect();
      const cursorRect = view.coordsAtPos(view.state.selection.from);

      if (cursorRect.top - editorRect.top < REM) {
        const above = (() => {
          const outline = store.getOutline(outlineId);
          if (!outline?.parentId) return null;
          const siblings = store.getOutlineChildren(outline.parentId);
          if (!siblings) return outline.parentId;
          const { found, index } = siblings.findIndex(outline);
          if (found && index > 0) {
            const { id: aboveId } = siblings.at(index - 1) ?? {};
            return aboveId ? findAbove(aboveId, store) : null;
          } else {
            return outline.parentId;
          }
        })();

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
        const below = (() => {
          const outline = store.getOutline(outlineId);
          const children = store.getOutlineChildren(outlineId);

          if (
            children &&
            children.size > 0 &&
            (outlineId === viewStateStore.getState().id || (outline && !outline.collapsed))
          )
            return children.at(0)?.id;

          if (!outline?.parentId) return null;
          const siblings = store.getOutlineChildren(outline.parentId);
          if (!siblings) return outline.parentId;
          const { found, index } = siblings.findIndex(outline);
          if (found && siblings.size === index + 1) {
            return findBelow(outline.parentId, store);
          } else if (found) {
            return siblings.at(index + 1)?.id;
          } else {
            return null;
          }
        })();

        if (below) {
          event.preventDefault();
          focusManager.focus({ id: below, position: "end" });
        }
      }
    },
    Tab: (_, event) => {
      event.preventDefault();
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
      return [
        createKeydownHandlersExtension({
          ...common,
          Enter: async (view, _, editor) => {
            const start = view.state.selection.from;
            const end = view.state.doc.content.size;

            const rightContent: JSONContent[] = view.state.doc
              .slice(start, end)
              .toJSON()
              .content.map((node: JSONContent) => ({ type: "paragraph", content: node.content }));

            const doc: JSONContent = { type: "doc", content: rightContent };

            const childId = store.reducer.create("bullet", outlineId, "start", doc);

            editor.commands.blur();
            focusManager.focus({ id: childId, position: "end" });
          },
        }),
      ];
    case "bullet":
      return [
        createKeydownHandlersExtension({
          ...common,
          Enter: async (view, _, editor) => {
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
            focusManager.focus({ id: newOutlineId, position: "end" });
          },
        }),
      ];
    case "card":
      return [
        createKeydownHandlersExtension({
          ...common,
        }),
      ];
    case "code":
      return [
        createKeydownHandlersExtension({
          ...common,
        }),
      ];
  }
}

function findAbove(id: string, store: OutlineStore) {
  const children = store.getOutlineChildren(id);
  if (children) {
    const { id: tailId } = children.at(-1) ?? {};
    if (tailId) {
      const tail = store.getOutline(tailId);
      if (!tail) return id;
      if (tail.collapsed) {
        return tail.id;
      } else {
        return findAbove(tail.id, store);
      }
    } else {
      return id;
    }
  } else {
    return id;
  }
}

function findBelow(parentId: string, store: OutlineStore): string | null {
  const parent = store.getOutline(parentId);
  if (!parent?.parentId) return null;
  const siblings = store.getOutlineChildren(parent.parentId);
  if (!siblings) return null;
  const { index } = siblings.findIndex(parent);
  if (siblings.size > index + 1) {
    return siblings.at(index + 1)?.id ?? null;
  } else {
    return parent.parentId ? findBelow(parent.parentId, store) : null;
  }
}
