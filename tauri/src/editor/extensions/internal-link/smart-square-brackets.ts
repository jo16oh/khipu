import { Extension, InputRule } from "@tiptap/core";
import { Plugin, PluginKey, Selection } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { KeyboardEventHandler, runHandlerIfMatches } from "src/utils/keyboard-event-handler";
import { Key } from "ts-keycode-enum";

export const SmartSquareBracketsExtension = Extension.create({
  addInputRules: () => [
    new InputRule({
      find: /(\[)$/,
      handler: ({ state, range }) => {
        const { to } = range;
        state.tr.insertText("[]", to);
        state.tr.setSelection(Selection.near(state.tr.doc.resolve(to + 1)));
      },
    }),
  ],

  addProseMirrorPlugins: () => [
    new Plugin({
      key: new PluginKey("smart-square-brackets"),
      props: {
        handleKeyDown(view, event) {
          const preventDefault = runHandlerIfMatches(event, backspaceHandler, view);
          if (typeof preventDefault === "boolean") {
            return preventDefault;
          }
          return;
        },
      },
    }),
  ],
});

const backspaceHandler: KeyboardEventHandler<[EditorView]> = {
  on: [Key.Backspace],
  fn: (_, view) => {
    const { from, to } = view.state.selection;
    if (from !== to) return false;

    const startPos = from - 1;
    const endPos = to + 1;

    const surroundingText = view.state.doc.textBetween(startPos, endPos);

    if (surroundingText === "[]") {
      view.dispatch(view.state.tr.delete(startPos, endPos));
      return true;
    }

    return false;
  },
};
