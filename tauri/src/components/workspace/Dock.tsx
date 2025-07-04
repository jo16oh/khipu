import { styled } from "generated/styled-system/jsx";
import { square } from "generated/styled-system/patterns";
import { ClockArrowDown, Search, StickyNote } from "lucide-react";
import { Button } from "react-aria-components";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useShallow } from "zustand/react/shallow";
import CreateNewOutlineButton from "./Dock/CreateNewOutlineButton";

export default function Dock() {
  const [focus, switchTab] = useWorkspaceState(
    useShallow(({ focus, switchTab }) => [focus, switchTab]),
  );

  return (
    <Container>
      <Tabs>
        <TabItem
          className="group"
          data-selected={focus === "timeline" ? true : undefined}
          onClick={() => switchTab("timeline")}
        >
          <ClockArrowDown
            className={iconStyle}
            data-selected={focus === "timeline" ? true : undefined}
          />
        </TabItem>
        <TabItem
          className="group"
          data-selected={focus === "search" ? true : undefined}
          onClick={() => switchTab("search")}
        >
          <Search className={iconStyle} data-selected={focus === "search" ? true : undefined} />
        </TabItem>
        <TabItem
          className="group"
          data-selected={focus === "stage" ? true : undefined}
          onClick={() => switchTab("stage")}
        >
          <StickyNote className={iconStyle} data-selected={focus === "stage" ? true : undefined} />
        </TabItem>
      </Tabs>
      <CreateNewOutlineButton />
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

const Tabs = styled("div", {
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

const TabItem = styled(Button, {
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

const iconStyle = square({
  size: "5",
  color: "stone.600",
  _selected: {
    color: "stone.900",
  },
});
