import { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer";
import { useMemo } from "react";
import { OutlineType } from "src/model";
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

  return (
    <div className="static-renderer tiptap ProseMirror">
      {renderToReactElement({
        extensions,
        content: doc,
        options: {
          nodeMapping: {
            // @ts-expect-error NodeViewProps is incompatible with NodeProps from static renderer
            "internal-link": InternalLinkNodeView,
          },
        },
      })}
    </div>
  );
}
