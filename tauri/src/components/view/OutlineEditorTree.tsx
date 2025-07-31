import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { ErrorBoundary } from "react-error-boundary";
import { useFetchOutlineTree } from "src/hooks/useFetchOutlineTree";
import { useOutline } from "src/hooks/useOutline";
import { useOutlineChildren } from "src/hooks/useOutlineChildren";
import Triangle from "src/icons/triangle";
import { useOutlineStore } from "src/stores/outline-store";
import { useViewState } from "src/stores/view-state-store";
import BulletButton from "../common/BulletButton";
import EllipsisMenu from "../common/EllipsisMenu";
import Editor from "../Editor";
import { SelectableItem, SelectionArea, useSelectionState } from "./selection";

export default function OutlineEditorTree({ id }: { id: string }) {
  return (
    <ErrorBoundary resetKeys={[id]} fallback="outline not found">
      <SelectionArea boundaries=".scroll-area">
        <RootOutlineEditor id={id} />
      </SelectionArea>
    </ErrorBoundary>
  );
}

function RootOutlineEditor({ id }: { id: string }) {
  useFetchOutlineTree(id);

  const { parentId, attrs, collapsed, deleted } = useOutline(
    id,
    ({ parentId, attrs, collapsed, deleted }) => ({
      parentId,
      attrs,
      collapsed,
      deleted,
    }),
  );

  if (deleted) throw new Error("outline is deleted");
  const children = useOutlineChildren(id);

  const { shouldDisplayAsSelected } = useSelectionState(id);

  return !deleted ? (
    <ErrorBoundary resetKeys={[id]} fallback="outline not found">
      <SelectionArea boundaries=".scroll-area">
        <EditorContainer
          className="group view-root"
          key={id}
          data-heading-level={attrs.type === "heading" ? attrs.level : undefined}
        >
          <OutlineControlButtons
            id={id}
            parentId={parentId}
            collapsed={collapsed}
            hasChildren={true}
          />
          <Editor id={id} />
        </EditorContainer>
        <ChildrenContainer level="top" data-is-selected={shouldDisplayAsSelected}>
          {children?.map(({ id }) => <OutlineEditor key={id} id={id} />)}
        </ChildrenContainer>
      </SelectionArea>
    </ErrorBoundary>
  ) : (
    <div>outline is deleted</div>
  );
}

function OutlineEditor({ id }: { id: string }) {
  const children = useOutlineChildren(id);

  const { parentId, attrs, collapsed, deleted } = useOutline(
    id,
    ({ parentId, attrs, collapsed, deleted }) => ({
      parentId,
      attrs,
      collapsed,
      deleted,
    }),
  );

  const { shouldDisplayAsSelected } = useSelectionState(id);

  return !deleted ? (
    <>
      <SelectableItem className={selectableItemStyle} id={id}>
        <EditorContainer
          className="group"
          key={id}
          data-heading-level={attrs.type === "heading" ? attrs.level : undefined}
        >
          <OutlineControlButtons
            id={id}
            parentId={parentId}
            collapsed={collapsed}
            hasChildren={Boolean(children?.size)}
          />
          <StyledBulletButton data-is-bullet={attrs.type === "bullet"} isCollapsed={collapsed} />
          <Editor id={id} />
        </EditorContainer>
      </SelectableItem>
      {children?.size && !collapsed ? (
        <ChildrenContainer data-is-selected={shouldDisplayAsSelected}>
          {children.map(({ id }) => (
            <OutlineEditor key={id} id={id} />
          ))}
          <VerticalLine />
        </ChildrenContainer>
      ) : (
        <></>
      )}
    </>
  ) : (
    <div>outline is deleted</div>
  );
}

function OutlineControlButtons({
  id,
  parentId,
  collapsed,
  hasChildren,
}: {
  id: string;
  parentId: string | null;
  collapsed: boolean;
  hasChildren: boolean;
}) {
  const viewId = useViewState(({ id }) => id);
  const store = useOutlineStore();

  const isRoot = id === viewId;

  return (
    <Buttons data-is-root={isRoot} data-is-top-level-child={parentId === viewId}>
      <EllipsisMenu content={() => "content"} />
      {!isRoot && (collapsed || hasChildren) ? (
        <ToggleCollapsedButton
          onClick={async () => {
            await store.loader.fetchTree(id);
            store.reducer.toggleCollapsed(id);
          }}
        >
          <StyledTriangle data-collapsed={collapsed} />
        </ToggleCollapsedButton>
      ) : (
        <></>
      )}
    </Buttons>
  );
}

const Buttons = styled("div", {
  base: {
    display: "flex",
    pos: "absolute",
    right: "full",
    alignItems: "center",
    h: "[1lh]",
    "&[data-is-root='true']": {
      pr: "4",
    },
    "&[data-is-top-level-child='false']": {
      gap: "2.5",
    },
  },
});

const EditorContainer = styled("div", {
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

const ToggleCollapsedButton = styled("button", {
  base: {
    display: "grid",
    w: "6",
    h: "6",
    placeContent: "center",
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
    pr: "1",
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
    pos: "relative",
    flexDir: "column",
    w: "full",
    pl: "9",
    pr: "1",
    "&[data-is-selected='true']": {
      bg: "blue.200",
    },
  },
});

const selectableItemStyle = css({
  py: "0.5",
  pl: "1",
});

const VerticalLine = styled("div", {
  base: {
    pos: "absolute",
    left: "3",
    w: "[0.0625rem]",
    h: "full",
    bg: "stone.200",
  },
});
