import { PluginKey } from "@tiptap/pm/state";
import { Editor, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { OutlineStore } from "src/stores/outline-store";
import { KeyboardEventHandler, runHandlerIfMatches } from "src/utils/keyboard-event-handler";
import tippy, { GetReferenceClientRect } from "tippy.js";
import { Key } from "ts-keycode-enum";
import { SuggestionPluginState } from "../suggestion";
import SuggestionRenderer from "./SuggestionRenderer";

export const InternalLinkSuggestionPluginKey = new PluginKey<SuggestionPluginState>(
  "internal-link-suggestion",
);

export function createInternalLinkSuggestionPlugin(editor: Editor, store: OutlineStore) {
  return Suggestion({
    pluginKey: InternalLinkSuggestionPluginKey,

    editor,

    items: ({ query }) => store.loader.fetchSuggestion(query),

    render: () => {
      let reactRenderer: ReactRenderer | undefined;
      let popup: ReturnType<typeof tippy> | undefined;

      return {
        onStart(props) {
          if (!props.clientRect) return;

          reactRenderer = new ReactRenderer(SuggestionRenderer, {
            props,
            editor: props.editor,
          });

          if (reactRenderer.element instanceof HTMLElement) {
            reactRenderer.element.style.position = "absolute";
          }

          document.body.appendChild(reactRenderer.element);

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as GetReferenceClientRect,
            appendTo: () => document.body,
            content: reactRenderer?.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
        },

        onUpdate(props) {
          reactRenderer?.updateProps(props);

          if (props.clientRect) return;

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as GetReferenceClientRect | null,
          });
        },

        onKeyDown({ event, view, range }) {
          const handlers: KeyboardEventHandler[] = [
            {
              on: [Key.Escape],
              fn: (event) => {
                event.preventDefault();
                event.stopPropagation();
                reactRenderer?.destroy();
                reactRenderer?.element.remove();
                popup?.[0]?.destroy();

                view.dispatch(view.state.tr.delete(range.from, range.to));

                return true;
              },
            },
          ];

          return handlers.reduce((prev, handler) => {
            const preventDefault = runHandlerIfMatches(event, handler);
            return typeof preventDefault === "boolean" ? preventDefault || prev : prev;
          }, false);
        },

        onExit() {
          popup?.[0]?.destroy();
          reactRenderer?.destroy();
          reactRenderer?.element.remove();
        },
      };
    },

    findSuggestionMatch({ $position }) {
      const regexp = /\[\[(.*?)\]\]/g;

      const parent = $position.parent;
      const textContent = parent.textContent;

      if (!textContent) return null;

      const parentFrom = $position.start();

      const matches = Array.from(textContent.matchAll(regexp));

      const activeMatch = matches.find((match) => {
        const matchFrom = parentFrom + (match.index || 0);
        const matchTo = matchFrom + match[0].length;

        // カーソルが[[]]の内側にあるかどうかチェック
        return $position.pos >= matchFrom + 2 && $position.pos <= matchTo - 2;
      });

      if (!activeMatch) return null;

      const from = parentFrom + (activeMatch.index || 0);
      const to = from + activeMatch[0].length;
      const query = activeMatch[1] ?? "";
      const text = activeMatch[0];

      return {
        range: {
          from,
          to,
        },
        query,
        text: text,
      };
    },
  });
}
