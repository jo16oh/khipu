import { styled } from "generated/styled-system/jsx";
import { ErrorBoundary } from "react-error-boundary";
import { useFetchOutlineTree } from "src/hooks/useFetchOutlineTree";
import { useOutline } from "src/hooks/useOutline";
import { useOutlineChildren } from "src/hooks/useOutlineChildren";
import BulletButton from "./common/BulletButton";
import Editor from "./Editor";

export default function OutlineTreeEditor({ id }: { id: string }) {
  useFetchOutlineTree(id);
  const deleted = useOutline(id, ({ deleted }) => deleted);
  if (deleted) throw new Error("outline is deleted");
  const children = useOutlineChildren(id);

  return !deleted ? (
    <ErrorBoundary resetKeys={[id]} fallback="outline not found">
      <Editor id={id} />
      {children?.map(({ id }) => <Outline key={id} id={id} />)}
    </ErrorBoundary>
  ) : (
    <div>outline is deleted</div>
  );
}

function Outline({ id }: { id: string }) {
  const children = useOutlineChildren(id);
  const { collapsed, deleted } = useOutline(id, ({ collapsed, deleted }) => ({
    collapsed,
    deleted,
  }));

  return !deleted ? (
    <>
      <Container key={id}>
        <BulletButton isCollapsed={collapsed} />
        <Editor id={id} />
      </Container>
      <Children>{!collapsed && children?.map(({ id }) => <Outline key={id} id={id} />)}</Children>
    </>
  ) : (
    <div>outline is deleted</div>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    w: "full",
  },
});

const Children = styled("div", {
  base: {
    w: "full",
    pl: "8",
  },
});
