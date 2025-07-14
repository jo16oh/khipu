import { styled } from "generated/styled-system/jsx";
import { center, square } from "generated/styled-system/patterns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startTransition } from "react";
import { Button } from "react-aria-components";
import { useViewState } from "src/stores/view-state-store";
import { useShallow } from "zustand/react/shallow";

export default function ViewHeader() {
  const { hasPrev, hasNext, back, next } = useViewState(
    useShallow(({ hasPrev, hasNext, back, next }) => ({ hasPrev, hasNext, back, next })),
  );

  return (
    <Header>
      <HistoryButton
        className="group"
        isDisabled={!hasPrev()}
        onClick={() => startTransition(back)}
      >
        <ChevronLeft className={headerIconStyle} />
      </HistoryButton>
      <HistoryButton
        className="group"
        isDisabled={!hasNext()}
        onClick={() => startTransition(next)}
      >
        <ChevronRight className={headerIconStyle} />
      </HistoryButton>
    </Header>
  );
}

const Header = styled("div", {
  base: {
    display: "flex",
    gap: "2",
    alignItems: "center",
    p: "1",
  },
});

const HistoryButton = styled(Button, {
  base: center.raw({
    rounded: "full",
    p: "1",
    _disabled: {
      _hover: {
        bg: "transparent",
      },
    },
    _hover: {
      bg: "stone.200",
    },
  }),
});

const headerIconStyle = square({
  size: "5",
  color: "stone.500",
  _groupDisabled: {
    color: "stone.300",
  },
});
