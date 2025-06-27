import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { center, square } from "generated/styled-system/patterns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ReactNode, useRef } from "react";
import { Button } from "react-aria-components";
import { useOutlineStore } from "src/stores/outline-store";
import { ViewStateStoreContext, createViewStateStore } from "src/stores/view-state-store";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import Dialog from "../common/Dialog";
import DialogSideActionButton, {
  dialogSideActionButtonIconStyle,
} from "../common/DialogSideButton";

export default function HoverViewModal({ trigger }: { trigger: ReactNode }) {
  const outlineStore = useOutlineStore();

  const viewStateStore = useRef(createViewStateStore());

  const viewState = useStore(viewStateStore.current);

  const [_hover, openHover, closeHover] = useWorkspaceState(
    useShallow(({ hover, openHover, closeHover }) => [hover, openHover, closeHover]),
  );

  return (
    <ViewStateStoreContext value={viewStateStore.current}>
      <Dialog
        trigger={trigger}
        triggerProps={{
          onOpenChange(isOpen) {
            if (isOpen) {
              const id = outlineStore.reducer.create("heading");
              viewState.jump({ id, scrollPosition: 0 });
              openHover(viewStateStore.current);
            } else {
              closeHover();
            }
          },
        }}
        buttons={(state) => (
          <DialogSideActionButton onClick={state.close}>
            <X className={css(dialogSideActionButtonIconStyle)} />
          </DialogSideActionButton>
        )}
        content={() => (
          <ViewCotainer>
            <ViewHeader>
              <HistoryButton
                className="group"
                isDisabled={!viewState.hasPrevious()}
                onClick={viewState.back}
              >
                <ChevronLeft className={headerIconStyle} />
              </HistoryButton>
              <HistoryButton
                className="group"
                isDisabled={!viewState.hasNext()}
                onClick={viewState.next}
              >
                <ChevronRight className={headerIconStyle} />
              </HistoryButton>
            </ViewHeader>
            {viewState.id}
          </ViewCotainer>
        )}
      />
    </ViewStateStoreContext>
  );
}

const ViewCotainer = styled("div", {
  base: {
    rounded: "md",
    h: "[90vh]",
    px: "1.5",
    bg: "stone.50",
  },
});

const ViewHeader = styled("div", {
  base: {
    display: "flex",
    gap: "2",
    alignItems: "center",
    borderBottomWidth: "thin",
    borderBottomColor: "stone.200",
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
  size: "4",
  color: "stone.500",
  _groupDisabled: {
    color: "stone.300",
  },
});
