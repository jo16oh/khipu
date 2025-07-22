import { styled } from "generated/styled-system/jsx";
import { Button } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { useFetchOutlineTree } from "src/hooks/useFetchOutlineTree";
import { useOutline } from "src/hooks/useOutline";
import { useOutlineChildren } from "src/hooks/useOutlineChildren";
import Triangle from "src/icons/triangle";
import { useOutlineStore } from "src/stores/outline-store";
import BulletButton from "../common/BulletButton";
import EllipsisMenu from "../common/EllipsisMenu";
import Editor from "../Editor";

export default function OutlineTreeEditor({ id }: { id: string }) {
  useFetchOutlineTree(id);
  const { deleted, attrs } = useOutline(id, ({ deleted, attrs }) => ({ deleted, attrs }));
  if (deleted) throw new Error("outline is deleted");
  const children = useOutlineChildren(id);

  return !deleted ? (
    <ErrorBoundary resetKeys={[id]} fallback="outline not found">
      <Container
        className="group"
        key={id}
        data-heading-level={attrs.type === "heading" ? attrs.level : undefined}
      >
        <Buttons pr="3">
          <EllipsisMenu content={() => "content"} />
        </Buttons>
        <Editor id={id} />
      </Container>
      <ChildrenContainer level="top">
        {children?.map(({ id }) => <Outline key={id} id={id} />)}
      </ChildrenContainer>
    </ErrorBoundary>
  ) : (
    <div>outline is deleted</div>
  );
}

function Outline({ id }: { id: string }) {
  const children = useOutlineChildren(id);

  const store = useOutlineStore();

  const { attrs, collapsed, deleted } = useOutline(id, ({ attrs, collapsed, deleted }) => ({
    attrs,
    collapsed,
    deleted,
  }));

  return !deleted ? (
    <>
      <Container
        className="group"
        key={id}
        data-heading-level={attrs.type === "heading" ? attrs.level : undefined}
      >
        <Buttons>
          <EllipsisMenu content={() => "content"} />
          {(collapsed || children?.size) && (
            <Button
              onClick={async () => {
                await store.loader.fetchTree(id);
                store.reducer.toggleCollapsed(id);
              }}
            >
              <StyledTriangle data-collapsed={collapsed} />
            </Button>
          )}
        </Buttons>
        <StyledBulletButton data-is-bullet={attrs.type === "bullet"} isCollapsed={collapsed} />
        <Editor id={id} />
      </Container>
      {children?.size && !collapsed && (
        <ChildrenContainer>
          {children.map(({ id }) => (
            <Outline key={id} id={id} />
          ))}
        </ChildrenContainer>
      )}
    </>
  ) : (
    <div>outline is deleted</div>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    pos: "relative",
    alignItems: "start",
    w: "full",
    "&[data-heading-level='1']": {
      fontSize: "h1",
    },
    "&[data-heading-level='2']": {
      fontSize: "h2",
    },
    "&[data-heading-level='3']": {
      fontSize: "h3",
    },
    "&[data-heading-level='4']": {
      fontSize: "h4",
    },
    "&[data-heading-level='5']": {
      fontSize: "h5",
    },
    "&[data-heading-level='6']": {
      fontSize: "h6",
    },
  },
});

const Buttons = styled("div", {
  base: {
    display: "flex",
    pos: "absolute",
    right: "full",
    gap: "1",
    alignItems: "center",
    h: "[1lh]",
    pr: "1.5",
  },
});

const StyledTriangle = styled(Triangle, {
  base: {
    w: "4",
    h: "4",
    color: "stone.300",
    "&[data-collapsed='false']": {
      transform: "[rotate(90deg)]",
    },
  },
});

const StyledBulletButton = styled(BulletButton, {
  base: {
    h: "[1lh]",
    pr: "1.5",
    opacity: "0",
    _groupHover: {
      opacity: "100",
    },
    "&[data-is-bullet=true]": {
      opacity: "100",
    },
  },
});

const ChildrenContainer = styled("div", {
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
