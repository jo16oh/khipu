import { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer";
import { OutlineType } from "generated/tauri-commands";
import { useMemo } from "react";
import { useOutlineStore } from "src/stores/outline-store";
import { createRendererExtensions } from "./schema";

export default function StaticRenderer({ type, doc }: { type: OutlineType; doc: JSONContent }) {
  const store = useOutlineStore();
  const extensions = useMemo(() => createRendererExtensions(type, store), [type, store]);

  return renderToReactElement({
    extensions,
    content: doc,
    options: {
      nodeMapping: {
        // @ts-expect-error NodeViewProps is incompatible with NodeProps from static renderer
        "internal-link": InternalLinkNodeView,
      },
    },
  });
}
