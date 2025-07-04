import { styled } from "generated/styled-system/jsx";
import { ErrorBoundary } from "react-error-boundary";
import { useFetchOutlineTree } from "src/hooks/useFetchOutlineTree";
import { useOutlineChildren } from "src/hooks/useOutlineChildren";
import BulletButton from "./common/BulletButton";
import Editor from "./Editor";

export default function OutlineTreeEditor({ id }: { id: string }) {
  useFetchOutlineTree(id);

  return (
    <ErrorBoundary resetKeys={[id]} fallback="outline not found">
      <RootEditor id={id} />
      <EditorWithChildren id={id} />
    </ErrorBoundary>
  );
}

function RootEditor({ id }: { id: string }) {
  return <Editor id={id} />;
}

function EditorWithChildren({ id }: { id: string }) {
  const children = useOutlineChildren(id);

  return children.map((id) => (
    <Container key={id}>
      <BulletButton isCollapsed={false} />
      <EditorWithChildren id={id} />
    </Container>
  ));
}

const Container = styled("div", {
  base: {
    display: "flex",
    w: "full",
  },
});
