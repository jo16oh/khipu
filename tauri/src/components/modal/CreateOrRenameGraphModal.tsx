import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { styled } from "generated/styled-system/jsx";
import { circle } from "generated/styled-system/patterns";
import { commands } from "generated/tauri-commands";
import { X } from "lucide-react";
import { ComponentProps, FormEvent, ReactNode, useState } from "react";
import { Button, Input } from "react-aria-components";
import { useAppState } from "src/stores/app-state-store";
import { renameSavedWorkspaceState } from "src/stores/workspace-state-store";
import isValidFilename from "valid-filename";
import Dialog from "../common/Dialog";

const MAX_DB_NAME_LEN = 120;

type Props =
  | {
      kind: "create";
      trigger: ReactNode;
      overlayProps?: ComponentProps<typeof Dialog>["overlayProps"];
      close?: () => void;
    }
  | {
      kind: "rename";
      trigger: ReactNode;
      overlayProps?: ComponentProps<typeof Dialog>["overlayProps"];
      prevGraphName: string;
      close?: () => void;
    };

export default function RenameGraphModal(props: Props) {
  const { kind, trigger, close = () => {} } = props;

  const openGraph = useAppState((state) => state.openGraph);

  const queryClient = useQueryClient();

  const { data: graphList } = useSuspenseQuery({
    queryKey: ["graphList"],
    queryFn: commands.listGraph,
  });

  const { mutateAsync } = useMutation({
    mutationFn: async () => {
      switch (kind) {
        case "create":
          await commands.createGraph(newGraphName);
          openGraph(newGraphName);
          return;
        case "rename":
          await commands.renameGraph(props.prevGraphName, newGraphName.trim());
          await renameSavedWorkspaceState(props.prevGraphName, newGraphName);
          return;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["graphList"] });
      close();
    },
  });

  const [newGraphName, setNewGraphName] = useState("");
  const isDuplicateName =
    newGraphName.trim() !== "" && graphList.some((n) => n === newGraphName.trim());
  const isTooLong = newGraphName.length > MAX_DB_NAME_LEN;
  const isGraphNameInvalid = newGraphName.length ? !isValidFilename(newGraphName) : false;
  const isDisabled = !newGraphName.trim() || isDuplicateName || isTooLong || isGraphNameInvalid;
  const isError = isDuplicateName || isTooLong || isGraphNameInvalid;

  const handleSubmit = async (e: FormEvent, close: () => void) => {
    e.preventDefault();
    if (newGraphName.trim() && !isDuplicateName && !isTooLong) {
      await mutateAsync();
      close();
    }
  };

  return (
    <Dialog
      trigger={trigger}
      triggerProps={{
        onOpenChange: (isOpen) => {
          if (!isOpen) {
            close();
            setNewGraphName("");
          }
        },
      }}
      contentProps={{ style: { width: "calc(100vw - 6rem)", maxWidth: "28rem", height: "auto" } }}
      overlayProps={{ style: { zIndex: 2000 } }}
      content={({ close }) => (
        <Container>
          <Header>
            {kind === "create" ? (
              <div>Create new graph</div>
            ) : (
              <styled.div flex="1" minW="0" wordWrap={"break-word"}>
                Rename {props.prevGraphName}
              </styled.div>
            )}
            <CloseButton onClick={close}>
              <X />
            </CloseButton>
          </Header>
          <Form onSubmit={(e) => handleSubmit(e, close)}>
            <FormGroup>
              <StyledInput
                placeholder="Name your graph..."
                value={newGraphName}
                onChange={(e) => setNewGraphName(e.target.value)}
                // autoFocus
              />
              <ErrorMessageContainer>
                {isError && (
                  <ErrorMessage>
                    {isDuplicateName && "A graph with this name already exists"}
                    {isTooLong && `A graph name must be within ${MAX_DB_NAME_LEN} characters`}
                    {isGraphNameInvalid && "The new graph name is not a valid filename"}
                  </ErrorMessage>
                )}
              </ErrorMessageContainer>
            </FormGroup>
            <ButtonContainer>
              <SubmitButton type="submit" isDisabled={isDisabled}>
                {kind === "create" ? "Create" : "Rename"}
              </SubmitButton>
            </ButtonContainer>
          </Form>
        </Container>
      )}
    />
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    gap: "2",
    flexDir: "column",
    w: "full",
    h: "full",
    py: "3",
    px: "4",
  },
});

const Header = styled("div", {
  base: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
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

const Form = styled("form", {
  base: {
    display: "flex",
    gap: "2",
    flexDir: "column",
  },
});

const FormGroup = styled("div", {
  base: {
    display: "flex",
    gap: "1",
    flexDir: "column",
  },
});

const StyledInput = styled(Input, {
  base: {
    borderBottomWidth: "thin",
    borderColor: "stone.300",
    w: "full",
    p: "2",
    _focus: {
      ring: "none",
      borderColor: "blue.500",
    },
  },
});

const ButtonContainer = styled("div", {
  base: {
    display: "flex",
    justifyContent: "flex-end",
    p: "1",
  },
});

const SubmitButton = styled(Button, {
  base: {
    rounded: "4xl",
    py: "1",
    px: "4",
    color: "black",
    bg: "white",
    shadow: "sm",
    transition: "colors",
    _disabled: { cursor: "not-allowed", color: "stone.500", bg: "stone.200" },
    _hover: {
      cursor: "pointer",
      bg: "stone.200",
      _disabled: {
        cursor: "not-allowed",
      },
    },
  },
});

const ErrorMessageContainer = styled("div", {
  base: {
    minH: "12",
  },
});

const ErrorMessage = styled("div", {
  base: {
    color: "red.500",
    fontFamily: "mono",
    fontSize: "sm",
  },
});
