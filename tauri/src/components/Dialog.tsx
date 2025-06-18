import { styled } from "generated/styled-system/jsx";
import { CSSProperties, ReactNode } from "react";
import {
  Dialog as DialogContent,
  DialogRenderProps,
  DialogTrigger,
  Modal,
  ModalOverlay,
} from "react-aria-components";

export function Dialog({
  trigger,
  content,
  buttons,
  contentStyle = {},
}: {
  trigger: ReactNode;
  content: (props: DialogRenderProps) => ReactNode;
  buttons?: ReactNode;
  contentStyle?: CSSProperties;
}) {
  return (
    <DialogTrigger>
      {trigger}

      <StyledModalOverlay
        isDismissable
        shouldCloseOnInteractOutside={(e) => {
          return e.attributes.getNamedItem("data-tauri-drag-region") ? false : true;
        }}
      >
        <Modal isDismissable>
          {({ state }) => (
            <StyledDialogContent
              data-open={state.isOpen || undefined}
              data-closed={!state.isOpen || undefined}
              style={contentStyle}
            >
              {(props) => (
                <>
                  {buttons && <Buttons onClick={() => state.close()}>{buttons}</Buttons>}
                  {content(props)}
                </>
              )}
            </StyledDialogContent>
          )}
        </Modal>
      </StyledModalOverlay>
    </DialogTrigger>
  );
}

const StyledModalOverlay = styled(ModalOverlay, {
  base: {
    display: "grid",
    zIndex: 98,
    pos: "fixed",
    top: "0",
    left: "0",
    w: "screen",
    h: "screen",
    bg: "stone.900/60",
    placeContent: "center",
    duration: "fast",
    "&[data-entering]": {
      fadeIn: "0",
    },
    "&[data-exiting]": {
      fadeOut: "0",
    },
  },
});

const StyledDialogContent = styled(DialogContent, {
  base: {
    zIndex: 99,
    pos: "relative",
    top: "[7px]",
    ring: "none",
    rounded: "lg",
    w: "[calc(100vw - 5.5rem)]",
    maxW: "3xl",
    h: "fit",
    maxH: "[calc(100vh - 42px)]",
    bg: "stone.50",
    shadow: "lg",
    duration: "fast",
    _open: {
      fadeIn: "0",
      zoomIn: "0.75",
    },
    _closed: {
      fadeOut: "0",
      zoomOut: "0.75",
    },
  },
});

const Buttons = styled("div", {
  base: {
    display: "flex",
    zIndex: 100,
    pos: "absolute",
    top: "0",
    right: "-11",
    gap: "2",
    flexDir: "column",
    justifyContent: "start",
    alignItems: "end",
    w: "11",
    h: "fit",
    p: "1",
  },
});
