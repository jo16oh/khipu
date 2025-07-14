import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { X } from "lucide-react";
import { ReactNode, use, useDeferredValue } from "react";
import { useViewState, ViewStateStoreContext } from "src/stores/view-state-store";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useShallow } from "zustand/react/shallow";
import Dialog from "../common/Dialog";
import DialogSideActionButton, {
  dialogSideActionButtonIconStyle,
} from "../common/DialogSideButton";
import LazySuspense from "../common/LazySuspense";
import OutlineView from "../view/OutlineView";
import ViewHeader from "../view/ViewHeader";

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
              <ViewHeader />
              <OutlineView id={defferedId} />
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
