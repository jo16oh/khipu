import { Node } from "@tiptap/core";
import { NodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { ErrorBoundary } from "react-error-boundary";
import { OutlineStore } from "src/stores/outline-store";
import { SmartSquareBracketsExtension } from "./internal-link/smart-square-brackets";
import { createInternalLinkSuggestionPlugin } from "./internal-link/suggestion";

type InternalLinkAttributes = {
  id: string | null;
};

type InternallinkOptions = {
  suggestion: Omit<SuggestionOptions, "editor">;
};

type InternalLinkStorage = {
  wasLastTransactionAnInput: boolean;
};

export const createInternalLinkExtension = (store: OutlineStore) => {
  return Node.create<InternallinkOptions, InternalLinkStorage>({
    name: "internal-link",
    group: "inline",
    inline: true,
    selectable: true,
    atom: true,

    addAttributes() {
      return {
        id: {
          default: null,
        },
      };
    },

    addNodeView: () => ReactNodeViewRenderer(InternalLinkNodeView),

    addExtensions: () => [SmartSquareBracketsExtension],

    addProseMirrorPlugins() {
      return [createInternalLinkSuggestionPlugin(this.editor, store)];
    },
  });
};

function InternalLinkNodeView({ node }: NodeViewProps) {
  const { id } = node.attrs as InternalLinkAttributes;

  if (!id) {
    return <span>(Link ID not set)</span>;
  }

  return (
    <ErrorBoundary fallback={<span>(Link not found)</span>}>
      <Link id={id} />
    </ErrorBoundary>
  );
}

function Link({ id }: { id: string }) {
  // const doc = useOutline(id, (o) => o.doc);
  // const text = useMemo(() => extractTextFromDoc(doc), [doc]);
  return <div>{id}</div>;
}
