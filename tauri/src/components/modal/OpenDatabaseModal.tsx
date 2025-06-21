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
import CreateOrRenameDatabaseModal from "./CreateOrRenameDatabaseModal";
import DeleteDatabaseModal from "./DeleteDatabaseModal";

export default function OpenDatabaseModal({ trigger }: { trigger: ReactNode }) {
  const openDb = useAppState((state) => state.openDb);

  const { data: dbList } = useSuspenseQuery({
    queryKey: ["dbList"],
    queryFn: commands.listDb,
  });

  return (
    <Dialog
      trigger={trigger}
      contentProps={{ css: css.raw({ maxW: "[30rem]" }) }}
      content={({ close }) => (
        <Container>
          <Title>
            <div>Choose database to open</div>
            <CloseButton onClick={close}>
              <X />
            </CloseButton>
          </Title>
          <ListItemsContainer>
            {dbList.map((name) => (
              <ListItemContainer className="group" key={name}>
                <Square size="6" p="2">
                  <Ellipsis dbName={name} />
                </Square>
                <Square size="6" p="2">
                  <Bullet isDisabled={true} isCollapsed={true} />
                </Square>
                <OpenDbButton onClick={() => openDb(name)} key={name}>
                  {name}
                </OpenDbButton>
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

const ListItemContainer = styled("div", {
  base: {
    display: "flex",
    gap: "1",
  },
});

const Ellipsis = ({ dbName }: { dbName: string }) => {
  return (
    <EllipsisMenu
      popoverProps={{ style: { zIndex: 1000 } }}
      content={({ close }) => (
        <Flex flexDir="column" py="2" px="1.5">
          <DeleteDatabaseModal
            close={close}
            dbName={dbName}
            trigger={
              <EllipsisActionButton className={flex()}>
                <TrashIcon />
                Delete database
              </EllipsisActionButton>
            }
          />
          <CreateOrRenameDatabaseModal
            kind="rename"
            close={close}
            prevDbName={dbName}
            trigger={
              <EllipsisActionButton className={flex({})}>
                <PencilLineIcon />
                Rename database
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

const OpenDbButton = styled(Button, {
  base: {
    flex: "1",
    minW: "0",
    textAlign: "start",
    fontSize: "md",
    wordWrap: "break-word",
    _hover: { cursor: "pointer", textDecoration: "underline" },
  },
});
