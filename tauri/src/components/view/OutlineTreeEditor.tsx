import { styled } from "generated/styled-system/jsx";
import { ErrorBoundary } from "react-error-boundary";
import { useFetchOutlineTree } from "src/hooks/useFetchOutlineTree";
import { useOutline } from "src/hooks/useOutline";
import { useOutlineChildren } from "src/hooks/useOutlineChildren";
import BulletButton from "../common/BulletButton";
import Editor from "../Editor";

export default function OutlineTreeEditor({ id }: { id: string }) {
  useFetchOutlineTree(id);
  const deleted = useOutline(id, ({ deleted }) => deleted);
  if (deleted) throw new Error("outline is deleted");
  const children = useOutlineChildren(id);

  return !deleted ? (
    <ErrorBoundary resetKeys={[id]} fallback="outline not found">
      <Editor id={id} />
      <Children level="top">{children?.map(({ id }) => <Outline key={id} id={id} />)}</Children>
    </ErrorBoundary>
  ) : (
    <div>outline is deleted</div>
  );
}

function Outline({ id }: { id: string }) {
  const children = useOutlineChildren(id);

  const { attrs, collapsed, deleted } = useOutline(id, ({ attrs, collapsed, deleted }) => ({
    attrs,
    collapsed,
    deleted,
  }));

  return !deleted ? (
    <>
      <Container className="group" key={id}>
        <StyledBulletButton data-is-bullet={attrs.type === "bullet"} isCollapsed={collapsed} />
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
    gap: "1.5",
    alignItems: "start",
    w: "full",
  },
});

const StyledBulletButton = styled(BulletButton, {
  base: {
    h: "[1lh]",
    opacity: "0",
    _groupHover: {
      opacity: "100",
    },
    "&[data-is-bullet=true]": {
      opacity: "100",
    },
  },
});

const Children = styled("div", {
  variants: {
    level: {
      top: {
        pl: "0",
        pt: "3",
      },
    },
  },
  base: {
    display: "flex",
    gap: "0.5",
    flexDir: "column",
    w: "full",
    pl: "8",
  },
});
