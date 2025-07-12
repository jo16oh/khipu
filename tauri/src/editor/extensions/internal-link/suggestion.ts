import { computePosition, flip, shift } from "@floating-ui/dom";
import { PluginKey } from "@tiptap/pm/state";
import { Editor, posToDOMRect, ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { OutlineStore } from "src/stores/outline-store";
import { KeyboardEventHandler, runHandlerIfMatches } from "src/utils/keyboard-event-handler";
import { Key } from "ts-keycode-enum";
import { SuggestionPluginState } from "../suggestion";
import SuggestionList, { SuggestionListHandler } from "./SuggestionList";

export const InternalLinkSuggestionPluginKey = new PluginKey<SuggestionPluginState>(
  "internal-link-suggestion",
);

const updatePosition = (
  editor: Editor,
  element: HTMLElement,
  range: { from: number; to: number },
) => {
  const virtualElement = {
    getBoundingClientRect: () => posToDOMRect(editor.view, range.from, range.to),
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.zIndex = "1000";
  });
};

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
      let renderer: ReactRenderer<SuggestionListHandler> | undefined;

      return {
        onStart(props) {
          if (!props.clientRect) return;

          renderer = new ReactRenderer(SuggestionList, {
            props,
            editor: props.editor,
          });

          if (renderer.element instanceof HTMLElement) {
            renderer.element.style.position = "absolute";
            document.body.appendChild(renderer.element);
            updatePosition(props.editor, renderer.element, props.range);
          }
        },

        onUpdate(props) {
          renderer?.updateProps(props);

          if (!props.clientRect) return;

          if (renderer?.element instanceof HTMLElement) {
            updatePosition(props.editor, renderer.element, props.range);
          }
        },

        onKeyDown({ event, range }) {
          const handlers: KeyboardEventHandler[] = [
            {
              on: [Key.Escape],
              fn: (event) => {
                event.preventDefault();
                event.stopPropagation();
                renderer?.destroy();
                if (renderer?.element) renderer.element.remove();

                editor.commands.deleteRange(range);

                return true;
              },
            },
            {
              on: [Key.Tab],
              fn: (event) => {
                event.preventDefault();
                event.stopPropagation();
                return true;
              },
            },
            {
              on: [Key.UpArrow],
              fn: (event) => {
                event.preventDefault();
                event.stopPropagation();
                renderer?.ref?.goUp();
                return true;
              },
            },
            {
              on: [Key.DownArrow],
              fn: (event) => {
                event.preventDefault();
                event.stopPropagation();
                renderer?.ref?.goDown();
                return true;
              },
            },
            {
              on: [Key.Enter],
              fn: (event) => {
                event.preventDefault();
                event.stopPropagation();
                renderer?.ref?.select();
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
          renderer?.destroy();
          if (renderer?.element) renderer.element.remove();
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
