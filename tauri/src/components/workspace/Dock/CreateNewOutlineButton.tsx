import { styled } from "generated/styled-system/jsx";
import { square } from "generated/styled-system/patterns";
import { SquarePen } from "lucide-react";
import { startTransition, useRef } from "react";
import { Button } from "react-aria-components";
import { useFocusManager } from "src/stores/focus-manager";
import { useOutlineStore } from "src/stores/outline-store";
import {
  createViewStateStore,
  useViewState,
  ViewStateStoreContext,
} from "src/stores/view-state-store";
import HoverViewModal from "../../modal/HoverViewModal";

export default function CreateNewOutlineButton() {
  const viewStateStore = useRef(createViewStateStore());

  return (
    <ViewStateStoreContext value={viewStateStore.current}>
      <HoverViewModal trigger={<HoverViewTrigger />} />
    </ViewStateStoreContext>
  );
}

const HoverViewTrigger = () => {
  const outlineStore = useOutlineStore();
  const viewState = useViewState((state) => state);
  const focusManager = useFocusManager();

  return (
    <StyledTriggerButton
      onPress={async (e) => {
        const parentId = outlineStore.reducer.create({ type: "heading", level: 1 });
        const childId = outlineStore.reducer.create({ type: "bullet" }, parentId);
        await outlineStore.save(parentId);
        await outlineStore.save(childId);
        viewState.jump({ id: parentId, scrollPosition: 0 });
        focusManager.focus({ id: childId, position: "end" });
        startTransition(() => e.continuePropagation());
      }}
    >
      <SquarePen className={iconStyle} />
    </StyledTriggerButton>
  );
};

const StyledTriggerButton = styled(Button, {
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
