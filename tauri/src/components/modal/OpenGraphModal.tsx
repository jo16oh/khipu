import { useSuspenseQuery } from "@tanstack/react-query";
import { css } from "generated/styled-system/css";
import { Flex, Square, styled } from "generated/styled-system/jsx";
import { circle, flex, square } from "generated/styled-system/patterns";
import { commands } from "generated/tauri-commands";
import { PencilLine, Trash, X } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "react-aria-components";
import { useAppState } from "src/stores/app-state-store";
import Bullet from "../common/Bullet";
import Dialog from "../common/Dialog";
import EllipsisMenu from "../common/EllipsisMenu";
import CreateOrRenameGraphModal from "./CreateOrRenameGraphModal";
import DeleteGraphModal from "./DeleteGraphModal";

export default function OpenGraphModal({ trigger }: { trigger: ReactNode }) {
  const openGraph = useAppState((state) => state.openGraph);

  const { data: graphList } = useSuspenseQuery({
    queryKey: ["graphList"],
    queryFn: commands.listGraph,
  });

  return (
    <Dialog
      trigger={trigger}
      contentProps={{ css: css.raw({ maxW: "[30rem]" }) }}
      content={({ close }) => (
        <Container>
          <Title>
            <styled.div color="stone.900">Choose graph to open</styled.div>
            <CloseButton onClick={close}>
              <X />
            </CloseButton>
          </Title>
          <ListItemsContainer>
            {graphList.map((name) => (
              <ListItemContainer className="group" key={name}>
                <Square size="6">
                  <Ellipsis graphName={name} />
                </Square>
                <Square size="6">
                  <Bullet isDisabled={true} isCollapsed={true} />
                </Square>
                <OpenGraphButton
                  onClick={() => openGraph(name)}
                  key={name}
                  pl="2"
                  color="stone.900"
                >
                  {name}
                </OpenGraphButton>
              </ListItemContainer>
            ))}
          </ListItemsContainer>
        </Container>
      )}
    />
  );
}

const Container = styled("div", {
  base: {
    cursor: "default",
    display: "flex",
    gap: "2",
    flexDir: "column",
    w: "full",
    maxH: "[calc(100vh - 4rem)]",
    p: "4",
  },
});

const Title = styled("div", {
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    w: "full",
  },
});

const CloseButton = styled(Button, {
  base: circle.raw({
    size: "5",
    p: "0.5",
    color: "stone.400",
    transition: "colors",
    _hover: { color: "stone.900", bg: "stone.200" },
  }),
});

const ListItemsContainer = styled("div", {
  base: {
    display: "flex",
    gap: "1",
    flexDir: "column",
    h: "full",
    py: "2",
    px: "2",
    overflowX: "hidden",
    overflowY: "auto",
  },
});

const ListItemContainer = styled("div", { base: flex.raw() });

const Ellipsis = ({ graphName }: { graphName: string }) => {
  return (
    <EllipsisMenu
      popoverProps={{ style: { zIndex: 1000 } }}
      content={({ close }) => (
        <Flex gap="0.5" flexDir="column" py="1" px="1">
          <DeleteGraphModal
            close={close}
            graphName={graphName}
            trigger={
              <EllipsisActionButton className={flex({ gap: "2.5" })}>
                <TrashIcon className={css({ color: "stone.900" })} />
                <styled.div color="stone.900">Delete graph</styled.div>
              </EllipsisActionButton>
            }
          />
          <CreateOrRenameGraphModal
            kind="rename"
            close={close}
            prevGraphName={graphName}
            trigger={
              <EllipsisActionButton className={flex({ gap: "2.5" })}>
                <PencilLineIcon className={css({ color: "stone.900" })} />
                <styled.div color="stone.900">Rename graph</styled.div>
              </EllipsisActionButton>
            }
          />
        </Flex>
      )}
    />
  );
};

const TrashIcon = styled(Trash, {
  base: square.raw({ size: "4" }),
});

const PencilLineIcon = styled(PencilLine, {
  base: square.raw({ size: "4" }),
});

const EllipsisActionButton = styled(Button, {
  base: flex.raw({
    gap: "1",
    alignItems: "center",
    rounded: "sm",
    py: "0.5",
    px: "1",
    color: "stone.900",
    fontSize: "sm",
    _hover: { bg: "stone.200" },
  }),
});

const OpenGraphButton = styled(Button, {
  base: {
    flex: "1",
    minW: "0",
    textAlign: "start",
    fontSize: "md",
    wordWrap: "break-word",
    _hover: { cursor: "pointer", textDecoration: "underline" },
  },
});
