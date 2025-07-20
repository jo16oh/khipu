import { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer";
import { OutlineType } from "generated/tauri-commands";
import { useMemo } from "react";
import { useOutlineStore } from "src/stores/outline-store";
import { InternalLinkNodeView } from "./extensions/internal-link";
import { createRendererExtensions } from "./schema";

export default function StaticRenderer({
  id,
  type,
  doc,
}: {
  id: string;
  type: OutlineType;
  doc: JSONContent;
}) {
  const store = useOutlineStore();
  const extensions = useMemo(() => createRendererExtensions(id, type, store), [id, type, store]);

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
