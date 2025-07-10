import { styled } from "generated/styled-system/jsx";
import { square } from "generated/styled-system/patterns";
import { SquarePen } from "lucide-react";
import { startTransition, use, useRef } from "react";
import { Button, OverlayTriggerStateContext } from "react-aria-components";
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
  const overlayState = use(OverlayTriggerStateContext);
  const outlineStore = useOutlineStore();
  const viewState = useViewState((state) => state);

  return (
    <StyledTriggerButton
      onPress={() => {
        const id = outlineStore.reducer.create("heading");
        viewState.jump({ id, scrollPosition: 0 });
        startTransition(() => overlayState?.open());
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
