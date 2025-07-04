import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { center, square } from "generated/styled-system/patterns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ReactNode, startTransition, use, useDeferredValue } from "react";
import { Button } from "react-aria-components";
import { useViewState, ViewStateStoreContext } from "src/stores/view-state-store";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useShallow } from "zustand/react/shallow";
import Dialog from "../common/Dialog";
import DialogSideActionButton, {
  dialogSideActionButtonIconStyle,
} from "../common/DialogSideButton";
import LazySuspense from "../common/LazySuspense";
import OutlineTreeEditor from "../OutlineTreeEditor";

export default function HoverViewModal({ trigger }: { trigger: ReactNode }) {
  const viewStateStore = use(ViewStateStoreContext);
  const viewState = useViewState((state) => state);

  const { openHover, closeHover } = useWorkspaceState(
    useShallow(({ openHover, closeHover }) => ({ openHover, closeHover })),
  );

  const defferedId = useDeferredValue(viewState.id);

  const onOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      if (viewStateStore) openHover(viewStateStore);
    } else {
      closeHover();
    }
  };

  return (
    <Dialog
      trigger={trigger}
      triggerProps={{ onOpenChange }}
      buttons={(state) => (
        <DialogSideActionButton onClick={state.close}>
          <X className={css(dialogSideActionButtonIconStyle)} />
        </DialogSideActionButton>
      )}
      content={() => (
        <LazySuspense>
          {defferedId ? (
            <ViewCotainer>
              <ViewHeader>
                <HistoryButton
                  className="group"
                  isDisabled={!viewState.hasPrev()}
                  onClick={() => startTransition(viewState.back)}
                >
                  <ChevronLeft className={headerIconStyle} />
                </HistoryButton>
                <HistoryButton
                  className="group"
                  isDisabled={!viewState.hasNext()}
                  onClick={() => startTransition(viewState.next)}
                >
                  <ChevronRight className={headerIconStyle} />
                </HistoryButton>
              </ViewHeader>
              <OutlineTreeEditor id={defferedId} />
            </ViewCotainer>
          ) : null}
        </LazySuspense>
      )}
    />
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
