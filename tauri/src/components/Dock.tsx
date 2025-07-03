import { styled } from "generated/styled-system/jsx";
import { square } from "generated/styled-system/patterns";
import { ClockArrowDown, Search, SquarePen, StickyNote } from "lucide-react";
import { Button } from "react-aria-components";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useShallow } from "zustand/react/shallow";
import HoverViewModal from "./modal/HoverViewModal";

export default function Dock() {
  const [focus, switchTab] = useWorkspaceState(
    useShallow(({ focus, switchTab }) => [focus, switchTab]),
  );

  return (
    <Container>
      <Buttons>
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
          <StickyNote className={iconStyle} data-selected={focus === "stage" ? true : undefined} />
        </DockButton>
      </Buttons>
      <HoverViewModal
        trigger={
          <CreateNewOutlineButton>
            <SquarePen className={iconStyle} />
          </CreateNewOutlineButton>
        }
      />
    </Container>
  );
}

const Container = styled("div", {
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

const Buttons = styled("div", {
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
