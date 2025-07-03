import { styled } from "generated/styled-system/jsx";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { useFetchOutlineTree } from "src/hooks/useFetchOutlineTree";
import { useOutlineChildren } from "src/hooks/useOutlineChildren";
import BulletButton from "./common/BulletButton";
import Editor from "./Editor";

export default function OutlineTreeEditor({ id }: { id: string }) {
  useFetchOutlineTree(id);
  const children = useOutlineChildren(id);

  return (
    <>
      <div>Editor</div>
      <div>{id}</div>
      <ErrorBoundary fallback="outline not found">
        <Suspense fallback="pending...">
          <Editor id={id} />
          {children.map((id) => (
            <Container key={id}>
              <BulletButton isCollapsed={false} />
              <Editor id={id} />
            </Container>
          ))}
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    w: "full",
  },
});
