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

    command: ({ editor, range, props }) => {
      editor.commands.insertContentAt(range, [
        {
          type: "internal-link",
          attrs: {
            ...props,
          },
        },
      ]);
    },

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
      const parentFrom = $position.start();

      const allMatches: {
        match: RegExpMatchArray;
        nodeStartPos: number;
      }[] = [];

      parent.forEach((childNode, offsetInParent) => {
        if (!childNode.isText) {
          return;
        }

        const childText = childNode.text;
        if (!childText) return;
        const matchesInChild = Array.from(childText.matchAll(regexp));

        if (matchesInChild.length > 0) {
          const childNodeStartPos = parentFrom + offsetInParent;

          matchesInChild.forEach((match) => {
            allMatches.push({
              match,
              nodeStartPos: childNodeStartPos,
            });
          });
        }
      });

      if (allMatches.length === 0) return null;

      const activeMatchInfo = allMatches.find(({ match, nodeStartPos }) => {
        const matchFrom = nodeStartPos + (match.index || 0);
        const matchTo = matchFrom + match[0].length;

        // カーソルが [[]] の内側にあるかチェック
        // (+2, -2 は [[ と ]] の文字分)
        return $position.pos >= matchFrom + 2 && $position.pos <= matchTo - 2;
      });

      if (!activeMatchInfo) return null;

      const { match, nodeStartPos } = activeMatchInfo;

      const from = nodeStartPos + (match.index || 0);
      const to = from + match[0].length;
      const query = match[1] ?? "";
      const text = match[0];

      return {
        range: { from, to },
        query,
        text,
      };
    },
  });
}
