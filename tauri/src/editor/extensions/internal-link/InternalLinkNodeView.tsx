import { NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";
import { useMemo } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { extractTextFromDoc } from "src/editor/utils";
import { useOutline } from "src/hooks/useOutline";

interface InternalLinkAttributes {
  id: string | null;
}

export function InternalLinkNodeView({ node }: NodeViewProps) {
  const { id } = node.attrs as InternalLinkAttributes;

  if (!id) {
    return <span>(Link ID not set)</span>;
  }

  return (
    <NodeViewWrapper as="span">
      <ErrorBoundary fallback={<span>(Link not found)</span>}>
        <Link id={id} />
      </ErrorBoundary>
    </NodeViewWrapper>
  );
}

function Link({ id }: { id: string }) {
  const doc = useOutline(id, (o) => o.doc);
  const text = useMemo(() => extractTextFromDoc(doc), [doc]);
  return <span className="internal-link">{text}</span>;
}
