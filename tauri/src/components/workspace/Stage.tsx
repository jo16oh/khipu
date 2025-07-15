import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { useDeferredValue } from "react";
import { Button } from "react-aria-components";
import KhipuIcon from "src/icons/khipu-icon";
import { useOutlineStore } from "src/stores/outline-store";
import { useViewState, ViewStateStoreContext } from "src/stores/view-state-store";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import Bullet from "../common/Bullet";
import LazySuspense from "../common/LazySuspense";
import ScrollArea from "../common/ScrollArea";
import TitlebarHandler from "../common/TitlebarHandler";
import OutlineView from "../view/OutlineView";
import ViewHeader from "../view/ViewHeader";

export default function Stage() {
  const viewStateStore = useWorkspaceState(useShallow((state) => state.stage));

  const { id } = useStore(
    viewStateStore,
    useShallow(({ id, jump }) => ({ id, jump })),
  );

  const defferedId = useDeferredValue(id);

  return (
    <ViewStateStoreContext value={viewStateStore}>
      {defferedId ? (
        <>
          <LazySuspense>
            <TitlebarHandler borderBottomWidth="thin" borderBottomColor="stone.200" w="full" h="10">
              <MacOsTrafficLights data-tauri-drag-region />
              <ViewHeader data-tauri-drag-region />
            </TitlebarHandler>
            <ViewContainer>
              <View>
                <OutlineView id={defferedId} />
              </View>
            </ViewContainer>
          </LazySuspense>
        </>
      ) : (
        <Title />
      )}
    </ViewStateStoreContext>
  );
}

const Title = () => {
  const store = useOutlineStore();
  const [jump] = useViewState(useShallow(({ jump }) => [jump]));

  const createNewOutline = async () => {
    const id = store.reducer.create("heading");
    await store.save(id);
    jump({ id, scrollPosition: 0 });
  };

  return (
    <Container>
      <AppIconContainer>
        <KhipuIcon className={khipuIconStyle} />
      </AppIconContainer>
      <Operations>
        <Operation>
          <Bullet isCollapsed={true} isDisabled={true} />
          <CreateNewOutlineButton onClick={createNewOutline}>
            Create New Outline
          </CreateNewOutlineButton>
        </Operation>
      </Operations>
    </Container>
  );
};

const Container = styled("div", {
  base: {
    display: "flex",
    flex: "1",
    gap: "2",
    flexDir: "column",
    justifyContent: "center",
    alignItems: "center",
    bg: "stone.50",
  },
});

const AppIconContainer = styled("div", {
  base: {
    display: "flex",
    flexDir: "column",
    justifyContent: "center",
    alignItems: "center",
    w: "40",
    h: "40",
  },
});

const imageStyle = css.raw({
  userSelect: "none",
  pointerEvents: "none",
});

const khipuIconStyle = css(imageStyle, {
  p: "4",
  filter: "[drop-shadow(0px 4px 2px rgba(0, 0, 0, .25))]",
});

const Operations = styled("div", {
  base: {
    display: "flex",
    flexDir: "column",
    alignItems: "start",
    color: "stone.900",
  },
});

const Operation = styled("div", {
  base: {
    display: "flex",
    gap: "2",
    alignItems: "center",
  },
});

const ViewContainer = styled(ScrollArea, {
  base: {
    display: "flex",
    flexDir: "column",
    alignItems: "center",
    w: "full",
    h: "full",
  },
});

const View = styled("div", {
  base: {
    w: "full",
    maxW: "[46rem]",
    px: "4",
    pt: "12",
    pb: "[50%]",
  },
});

const CreateNewOutlineButton = styled(Button, {
  base: {
    color: "stone.900",
    _hover: {
      cursor: "pointer",
      textDecoration: "underline",
    },
  },
});

const MacOsTrafficLights = styled("div", {
  base: {
    w: "[5.375rem]",
    h: "full",
  },
});
