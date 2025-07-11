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

      const handlers: Record<number, KeyboardEventHandler<[EditorView, Editor]>[]> = groupBy(
        createHandlers(outlineId, type, store, focusManager, viewStateStore),
        (i) => i.on[0],
      );

      return [
        new Plugin({
          key: new PluginKey("KeydownHandlers"),
          props: {
            handleKeyDown(view, event) {
              return handlers[event.keyCode]?.reduce((prev, handler) => {
                const preventDefault = runKeyboardEventHandlerIfMatches(
                  event,
                  handler,
                  view,
                  editor,
                );
                return typeof preventDefault === "boolean" ? preventDefault || prev : prev;
              }, false);
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
): KeyboardEventHandler<[EditorView, Editor]>[] {
  const common = createCommonKeydownHandlers(outlineId, type, store, focusManager, viewStateStore);

  switch (type) {
    case "heading":
      return [...common, ...createHeadingKeydownHandlers(outlineId, store, focusManager)];
    case "bullet":
      return [...common, ...createBulletKeydownHandlers(outlineId, store, focusManager)];
    case "card":
      return [...common];
    case "code":
      return [...common];
  }
}
