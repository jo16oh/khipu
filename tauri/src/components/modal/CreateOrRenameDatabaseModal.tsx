import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { styled } from "generated/styled-system/jsx";
import { circle } from "generated/styled-system/patterns";
import { commands } from "generated/tauri-commands";
import { X } from "lucide-react";
import { ComponentProps, FormEvent, ReactNode, useState } from "react";
import { Button, Input } from "react-aria-components";
import { useAppState } from "src/stores/app-state-store";
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
      prevDbName: string;
      close?: () => void;
    };

export default function RenameDatabaseModal(props: Props) {
  const { kind, trigger, close = () => {} } = props;

  const openDb = useAppState((state) => state.openDb);

  const queryClient = useQueryClient();

  const { data: dbList } = useSuspenseQuery({
    queryKey: ["dbList"],
    queryFn: commands.listDb,
  });

  const { mutateAsync } = useMutation({
    mutationFn: () =>
      kind === "create"
        ? commands.createDb(newDbName)
        : commands.renameDb(props.prevDbName, newDbName.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dbList"] });
      close();
    },
  });

  const [newDbName, setNewDbName] = useState("");
  const isDuplicateName = newDbName.trim() !== "" && dbList.some((n) => n === newDbName.trim());
  const isTooLong = newDbName.length > MAX_DB_NAME_LEN;
  const isDbNameInvalid = newDbName.length ? !isValidFilename(newDbName) : false;
  const isDisabled = !newDbName.trim() || isDuplicateName || isTooLong || isDbNameInvalid;
  const isError = isDuplicateName || isTooLong || isDbNameInvalid;

  const handleSubmit = async (e: FormEvent, close: () => void) => {
    e.preventDefault();
    if (newDbName.trim() && !isDuplicateName && !isTooLong) {
      await mutateAsync();
      if (kind === "create") openDb(newDbName);
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
            setNewDbName("");
          }
        },
      }}
      contentProps={{ style: { width: "calc(100vw - 6rem)", maxWidth: "28rem", height: "auto" } }}
      overlayProps={{ style: { zIndex: 2000 } }}
      content={({ close }) => (
        <Container>
          <Header>
            {kind === "create" ? (
              <div>Create new database</div>
            ) : (
              <styled.div flex="1" minW="0" wordWrap={"break-word"}>
                Rename {props.prevDbName}
              </styled.div>
            )}
            <CloseButton onClick={close}>
              <X />
            </CloseButton>
          </Header>
          <Form onSubmit={(e) => handleSubmit(e, close)}>
            <FormGroup>
              <StyledInput
                placeholder="Name your database..."
                value={newDbName}
                onChange={(e) => setNewDbName(e.target.value)}
                // autoFocus
              />
              <ErrorMessageContainer>
                {isError && (
                  <ErrorMessage>
                    {isDuplicateName && "A database with this name already exists"}
                    {isTooLong && `A database name must be within ${MAX_DB_NAME_LEN} characters`}
                    {isDbNameInvalid && "The new database name is not a valid filename"}
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
    h: "fit",
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
