import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Editor, Extension } from "@tiptap/react";
import { groupBy } from "es-toolkit";
import { OutlineType } from "generated/tauri-commands";
import { FocusManager } from "src/stores/focus-manager";
import { OutlineStore } from "src/stores/outline-store";
import { ViewStateStore } from "src/stores/view-state-store";
import {
  KeyboardEventHandler,
  runKeyboardEventHandlerIfMatches,
} from "src/utils/keyboard-event-handler";
import { createBulletKeydownHandlers } from "./keydown-handlers/bullet";
import { createCommonKeydownHandlers } from "./keydown-handlers/common";
import { createHeadingKeydownHandlers } from "./keydown-handlers/heading";

export function createKeydownHandlersExtension(
  outlineId: string,
  type: OutlineType,
  store: OutlineStore,
  focusManager: FocusManager,
  viewStateStore: ViewStateStore,
) {
  return Extension.create({
    name: "KeydownHandlers",
    addProseMirrorPlugins() {
      const editor = this.editor;

      const handlers: Record<number, KeyboardEventHandler<[EditorView]>[]> = groupBy(
        createHandlers(outlineId, type, store, focusManager, viewStateStore, editor),
        (i) => i.on[0],
      );

      return [
        new Plugin({
          key: new PluginKey("KeydownHandlers"),
          props: {
            handleKeyDown(view, event) {
              let preventDefault: boolean | undefined;
              for (const handler of handlers[event.keyCode] ?? []) {
                const value = runKeyboardEventHandlerIfMatches(event, handler, view, editor);
                if (typeof value === "boolean") {
                  preventDefault = value || preventDefault;
                }
              }
              return preventDefault;
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
  editor: Editor,
): KeyboardEventHandler<[EditorView]>[] {
  const common = createCommonKeydownHandlers(
    outlineId,
    type,
    store,
    focusManager,
    viewStateStore,
    editor,
  );

  switch (type) {
    case "heading":
      return [...common, ...createHeadingKeydownHandlers(outlineId, store, focusManager, editor)];
    case "bullet":
      return [...common, ...createBulletKeydownHandlers(outlineId, store, focusManager, editor)];
    case "card":
      return [...common];
    case "code":
      return [...common];
  }
}
