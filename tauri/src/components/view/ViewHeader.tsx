import { styled } from "generated/styled-system/jsx";
import { center, square } from "generated/styled-system/patterns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startTransition, useMemo } from "react";
import { Button } from "react-aria-components";
import { extractTextFromDoc } from "src/editor/utils";
import { useOutline } from "src/hooks/useOutline";
import { useOutlinePath } from "src/hooks/useOutlinePath";
import { useViewState } from "src/stores/view-state-store";
import { useShallow } from "zustand/react/shallow";

export default function ViewHeader(props: object) {
  const { hasPrev, hasNext, back, next } = useViewState(
    useShallow(({ hasPrev, hasNext, back, next }) => ({ hasPrev, hasNext, back, next })),
  );

  const id = useViewState((state) => state.id);

  return (
    <Header {...props}>
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
      {id && <Path id={id} />}
    </Header>
  );
}

function Path({ id }: { id: string }) {
  const path = useOutlinePath(id);
  return path.map((id) => <PathItem key={id} id={id} />);
}

function PathItem({ id }: { id: string }) {
  const { type, doc } = useOutline(id, ({ type, doc }) => ({ type, doc }));
  const text = useMemo(() => extractTextFromDoc(doc), [doc]);
  return type === "heading" ? text : "...";
}

const Header = styled("div", {
  base: {
    display: "flex",
    gap: "2",
    alignItems: "center",
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
