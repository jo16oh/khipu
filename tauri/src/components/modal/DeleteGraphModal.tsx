import { useMutation, useQueryClient } from "@tanstack/react-query";
import { css } from "generated/styled-system/css";
import { Flex, styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { ReactNode, useState } from "react";
import { Button, Input } from "react-aria-components";
import Dialog from "../common/Dialog";

export default function DeleteGraphModal({
  close,
  graphName,
  trigger,
}: {
  close: () => void;
  graphName: string;
  trigger: ReactNode;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const canDelete = confirmInput === graphName;

  const queryClient = useQueryClient();

  const { mutate: deleteGraph } = useMutation({
    mutationFn: () => commands.deleteGraph(graphName),
    onSuccess: () => {
      close();
      queryClient.invalidateQueries({ queryKey: ["graphList"] });
    },
  });

  return (
    <Dialog
      trigger={trigger}
      triggerProps={{
        onOpenChange: (isOpen) => {
          if (!isOpen) {
            setConfirmInput("");
            close();
          }
        },
      }}
      overlayProps={{ style: { zIndex: 2000 } }}
      contentProps={{ style: { width: "calc(100vw - 6rem)", maxWidth: "28rem" } }}
      content={() => (
        <Flex gap="4" flexDir="column" rounded="md" p="4" bg="stone.50">
          <styled.div overflowWrap={"break-word"} wordWrap={"break-word"}>
            {"This will permanently delete "}
            <styled.span rounded="md" py="0.5" px="1" fontWeight={"bold"} bg="stone.200">
              {graphName}
            </styled.span>
            {". This action cannot be undone. To confirm, please type the name of the graph."}
          </styled.div>
          <Input
            className={css({
              ring: "none",
              borderBottomWidth: "thin",
              borderBottomColor: "stone.950",
              _focus: { borderBottomColor: "blue.500" },
            })}
            value={confirmInput}
            placeholder={graphName}
            onChange={(e) => setConfirmInput(e.target.value)}
          />
          <Flex justifyContent="end">
            <DeleteButton onClick={() => deleteGraph()} isDisabled={!canDelete}>
              Delete
            </DeleteButton>
          </Flex>
        </Flex>
      )}
    />
  );
}

const DeleteButton = styled(Button, {
  base: {
    rounded: "4xl",
    w: "fit",
    py: "1",
    px: "4",
    color: "stone.50",
    bg: "red.600",
    shadow: "sm",
    transition: "colors",
    _disabled: { cursor: "not-allowed", color: "stone.500", bg: "stone.200" },
    _hover: {
      cursor: "pointer",
      bg: "red.400",
      _disabled: {
        cursor: "not-allowed",
        bg: "stone.200",
      },
    },
  },
});
