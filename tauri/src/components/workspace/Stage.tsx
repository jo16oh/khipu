import { css } from "generated/styled-system/css";
import { Flex, styled } from "generated/styled-system/jsx";
import { useCallback } from "react";
import { Button } from "react-aria-components";
import { ViewStateStoreContext, useOutlineStore, useViewState } from "src/Providers";
import { useWorkspaceState } from "src/stores/workspace-state-store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import Bullet from "../common/Bullet";

export default function Stage() {
  const [viewStateStore] = useWorkspaceState(useShallow((state) => [state.stage]));

  const { id } = useStore(viewStateStore);

  return (
    <ViewStateStoreContext value={viewStateStore}>{id ? id : <Title />}</ViewStateStoreContext>
  );
}

const Title = () => {
  const store = useOutlineStore();
  const [jump] = useViewState(useShallow(({ jump }) => [jump]));

  const onClick = useCallback(() => {
    const id = store.reducer.create("heading");
    jump({ id, scrollPosition: 0 });
  }, [store.reducer, jump]);

  return (
    <Container>
      <AppIconContainer>
        <img src="assets/khipu-icon.svg" className={khipuIconStyle} />
      </AppIconContainer>
      <Operations>
        <Flex gap="2" alignItems="center">
          <Bullet isCollapsed={true} isDisabled={true} />
          <CreateNewOutlineButton onClick={onClick}>Create New Outline</CreateNewOutlineButton>
        </Flex>
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

const CreateNewOutlineButton = styled(Button, {
  base: {
    color: "stone.900",
    _hover: {
      cursor: "pointer",
      textDecoration: "underline",
    },
  },
});
