import { styled } from "generated/styled-system/jsx";
import { square } from "generated/styled-system/patterns";
import { commands } from "generated/tauri-commands";
import { ClockArrowDown, Search, SquarePen, StickyNote } from "lucide-react";
import { PropsWithChildren } from "react";
import { Button } from "react-aria-components";
import { useAppState } from "src/stores/app-state-store";
import { DocUpdateNotifier, DocUpdateNotifierContext } from "src/stores/doc-update-notifier";
import { FocusManager, FocusManagerContext } from "src/stores/focus-manager";
import { OutlineStore, OutlineStoreContext } from "src/stores/outline-store";
import { ViewStateStoreContext } from "src/stores/view-state-store";
import {
  useWorkspaceState,
  useWorkspaceStateStore,
  WorkspaceStateStoreContext,
} from "src/stores/workspace-state-store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import TitlebarHandler from "./common/TitlebarHandler";
import HoverViewModal from "./modal/HoverViewModal";
import Stage from "./workspace/Stage";

export default function Workspace() {
  const graphName = useAppState(useShallow(({ graphName }) => graphName));

  return graphName ? (
    <Providers graphName={graphName}>
      <WorkspaceImpl />
    </Providers>
  ) : null;
}

function Providers({ graphName, children }: { graphName: string } & PropsWithChildren) {
  const notifier = new DocUpdateNotifier();
  const focusManager = new FocusManager();
  const workspaceStateStore = useWorkspaceStateStore(graphName);
  const outlineStore = new OutlineStore(notifier, workspaceStateStore, commands);

  const stage = useStore(
    workspaceStateStore,
    useShallow(({ stage }) => stage),
  );

  return (
    <WorkspaceStateStoreContext value={workspaceStateStore}>
      <ViewStateStoreContext value={stage}>
        <DocUpdateNotifierContext value={notifier}>
          <OutlineStoreContext value={outlineStore}>
            <FocusManagerContext value={focusManager}>{children}</FocusManagerContext>
          </OutlineStoreContext>
        </DocUpdateNotifierContext>
      </ViewStateStoreContext>
    </WorkspaceStateStoreContext>
  );
}

function WorkspaceImpl() {
  const [graphName, closeGraph] = useAppState(
    useShallow(({ graphName, closeGraph }) => [graphName, closeGraph]),
  );

  const [focus, switchTab] = useWorkspaceState(
    useShallow(({ focus, switchTab }) => [focus, switchTab]),
  );

  return graphName ? (
    <>
      <TitlebarHandler bg="stone.50" />
      <Container>
        {focus === "timeline" && <div>timeline</div>}
        {focus === "search" && <div>search</div>}
        {focus === "stage" && <Stage />}
        <button onClick={closeGraph}>close {graphName}</button>
        <BottomNav>
          <Dock>
            <DockButton
              className="group"
              data-selected={focus === "timeline" ? true : undefined}
              onClick={() => switchTab("timeline")}
            >
              <ClockArrowDown
                className={iconStyle}
                data-selected={focus === "timeline" ? true : undefined}
              />
            </DockButton>
            <DockButton
              className="group"
              data-selected={focus === "search" ? true : undefined}
              onClick={() => switchTab("search")}
            >
              <Search className={iconStyle} data-selected={focus === "search" ? true : undefined} />
            </DockButton>
            <DockButton
              className="group"
              data-selected={focus === "stage" ? true : undefined}
              onClick={() => switchTab("stage")}
            >
              <StickyNote
                className={iconStyle}
                data-selected={focus === "stage" ? true : undefined}
              />
            </DockButton>
          </Dock>
          <HoverViewModal
            trigger={
              <CreateNewOutlineButton>
                <SquarePen className={iconStyle} />
              </CreateNewOutlineButton>
            }
          />
        </BottomNav>
      </Container>
    </>
  ) : (
    <></>
  );
}

const Container = styled("div", {
  base: {
    display: "grid",
    w: "screen",
    h: "screen",
    bg: "stone.50",
    placeContent: "center",
  },
});

const BottomNav = styled("div", {
  base: {
    display: "flex",
    pos: "fixed",
    left: "[50%]",
    bottom: "4",
    transform: "translate(-50%)",
    gap: "3",
    alignItems: "center",
  },
});

const Dock = styled("div", {
  base: {
    display: "flex",
    gap: "1.5",
    alignItems: "center",
    borderColor: "stone.200",
    rounded: "xl",
    borderWidth: "thin",
    w: "fit",
    py: "1",
    px: "2.5",
    bg: "white",
    shadow: "md",
  },
});

const DockButton = styled(Button, {
  base: {
    display: "grid",
    rounded: "xl",
    w: "9",
    h: "9",
    bg: "transparent",
    placeContent: "center",
    _selected: {
      bg: "blue.500/20",
      _hover: {
        bg: "blue.500/20",
      },
    },
    _hover: {
      bg: "stone.200",
    },
  },
});

const CreateNewOutlineButton = styled(Button, {
  base: {
    display: "grid",
    borderColor: "stone.200",
    rounded: "full",
    borderWidth: "thin",
    w: "11",
    h: "11",
    p: "4",
    bg: "white",
    shadow: "md",
    placeContent: "center",
    _hover: {
      cursor: "pointer",
      bg: "stone.200",
    },
  },
});

const iconStyle = square({
  size: "5",
  color: "stone.600",
  _selected: {
    color: "stone.900",
  },
});
