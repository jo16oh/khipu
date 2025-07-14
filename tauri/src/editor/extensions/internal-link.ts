import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { OutlineStore } from "src/stores/outline-store";
import { InternalLinkNodeView } from "./internal-link/InternalLinkNodeView";
import { SmartSquareBracketsExtension } from "./internal-link/smart-square-brackets";
import {
  createInternalLinkSuggestionPlugin,
  InternalLinkSuggestionPluginKey,
} from "./internal-link/suggestion";

export const InternalLink = Node.create({
  name: "internal-link",
  group: "inline",
  inline: true,
  selectable: false,
  atom: true,

  parseHTML() {
    return [{ tag: "internal-link" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["internal-link", mergeAttributes(HTMLAttributes)];
  },

  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(InternalLinkNodeView, {
      contentDOMElementTag: "span",
      as: "span",
    });
  },

  addExtensions() {
    return [SmartSquareBracketsExtension];
  },
});

export const createInternalLinkExtensionWithSuggestion = (store: OutlineStore) => {
  return InternalLink.extend({
    addProseMirrorPlugins() {
      return [createInternalLinkSuggestionPlugin(this.editor, store)];
    },
  });
};

export { InternalLinkSuggestionPluginKey, InternalLinkNodeView };
