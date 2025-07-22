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
import ScrollArea from "../common/ScrollArea";
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
            <Container>
              <Header>
                <ViewHeader />
              </Header>
              <ScrollArea>
                <View>
                  <OutlineView id={defferedId} />
                </View>
              </ScrollArea>
            </Container>
          ) : null}
        </LazySuspense>
      )}
    />
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    flexDir: "column",
    rounded: "md",
    h: "[90vh]",
    bg: "stone.50",
  },
});

const Header = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    borderBottomWidth: "thin",
    borderBottomColor: "stone.200",
    w: "full",
    h: "9",
    p: "1",
  },
});

const View = styled("div", {
  base: {
    flex: "1",
    w: "full",
    px: "2",
  },
});
