import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { center, square } from "generated/styled-system/patterns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ReactNode, Suspense, startTransition, useCallback, useDeferredValue, useRef } from "react";
import { Button } from "react-aria-components";
import { useOutlineStore } from "src/stores/outline-store";
import { createViewStateStore, ViewStateStoreContext } from "src/stores/view-state-store";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import Dialog from "../common/Dialog";
import DialogSideActionButton, {
  dialogSideActionButtonIconStyle,
} from "../common/DialogSideButton";
import OutlineTreeEditor from "../OutlineTreeEditor";

export default function HoverViewModal({ trigger }: { trigger: ReactNode }) {
  const outlineStore = useOutlineStore();
  const viewStateStore = useRef(createViewStateStore());
  const viewState = useStore(viewStateStore.current);
  const { openHover, closeHover } = useWorkspaceState(
    useShallow(({ openHover, closeHover }) => ({ openHover, closeHover })),
  );

  const defferedId = useDeferredValue(viewState.id);

  const onOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        startTransition(() => {
          const id = outlineStore.reducer.create("heading");
          viewState.jump({ id, scrollPosition: 0 });
          openHover(viewStateStore.current);
        });
      } else {
        closeHover();
      }
    },
    [outlineStore.reducer, viewState, openHover, closeHover],
  );

  const back = useCallback(() => {
    startTransition(() => viewState.back());
  }, [viewState]);

  const next = useCallback(() => {
    startTransition(() => viewState.next());
  }, [viewState]);

  return (
    <ViewStateStoreContext value={viewStateStore.current}>
      <Dialog
        trigger={trigger}
        triggerProps={{ onOpenChange }}
        buttons={(state) => (
          <DialogSideActionButton onClick={state.close}>
            <X className={css(dialogSideActionButtonIconStyle)} />
          </DialogSideActionButton>
        )}
        content={() => (
          <Suspense>
            {defferedId ? (
              <ViewCotainer>
                <ViewHeader>
                  <HistoryButton className="group" isDisabled={!viewState.hasPrev()} onClick={back}>
                    <ChevronLeft className={headerIconStyle} />
                  </HistoryButton>
                  <HistoryButton className="group" isDisabled={!viewState.hasNext()} onClick={next}>
                    <ChevronRight className={headerIconStyle} />
                  </HistoryButton>
                </ViewHeader>
                <OutlineTreeEditor id={defferedId} />
              </ViewCotainer>
            ) : null}
          </Suspense>
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
