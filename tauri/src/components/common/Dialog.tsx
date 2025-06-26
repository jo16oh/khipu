import { styled } from "generated/styled-system/jsx";
import { ComponentProps, ReactNode } from "react";
import { useRef } from "react";
import {
  Dialog as DialogContent,
  DialogRenderProps,
  DialogTrigger,
  DialogTriggerProps,
  Modal,
  ModalOverlay,
  OverlayTriggerState,
} from "react-aria-components";
import TitlebarHandler from "./TitlebarHandler";

const Dialog = ({
  trigger,
  triggerProps,
  content,
  contentProps,
  buttons,
  overlayProps,
}: {
  trigger: ReactNode;
  triggerProps?: Omit<DialogTriggerProps, "children">;
  content: (props: DialogRenderProps) => ReactNode;
  contentProps?: ComponentProps<typeof StyledDialogContent>;
  buttons?: (state: OverlayTriggerState) => ReactNode;
  overlayProps?: ComponentProps<typeof StyledModalOverlay>;
}) => {
  const stateRef = useRef<OverlayTriggerState | null>(null);

  const draggingWindow = useRef(false);

  return (
    <DialogTrigger {...triggerProps}>
      {trigger}

      <StyledModalOverlay
        isDismissable
        shouldCloseOnInteractOutside={(e) =>
          draggingWindow.current || e.attributes.getNamedItem("data-tauri-drag-region")
            ? false
            : true
        }
        {...overlayProps}
      >
        <TitlebarHandler
          onMouseDown={(e) => {
            draggingWindow.current = true;
            const startTime = Date.now();
            const startX = e.screenX;
            const startY = e.screenY;

            const cb = (e: MouseEvent) => {
              const endTime = Date.now();
              const endX = e.screenX;
              const endY = e.screenY;
              if (endTime - startTime < 200 && startX === endX && startY === endY) {
                stateRef.current?.close();
              }
              window.removeEventListener("mouseup", cb);

              // set draggingWindow to be false after shouldCloseOnInteractOutside called
              setTimeout(() => (draggingWindow.current = false));
            };

            window.addEventListener("mouseup", cb);
          }}
          zIndex="[9999]"
          position="fixed"
          top="0"
          left="0"
          bg="transparent"
        />
        <StyledModal isDismissable>
          {({ state }) => {
            stateRef.current = state;
            return (
              <StyledDialogContent {...contentProps}>
                {(props) => (
                  <>
                    {buttons && <Buttons onClick={() => state.close()}>{buttons(state)}</Buttons>}
                    {content(props)}
                  </>
                )}
              </StyledDialogContent>
            );
          }}
        </StyledModal>
      </StyledModalOverlay>
    </DialogTrigger>
  );
};

const StyledModalOverlay = styled(ModalOverlay, {
  base: {
    display: "grid",
    zIndex: "200",
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

const StyledModal = styled(Modal, {
  base: {
    "&[data-entering]": {
      fadeIn: "0",
      zoomIn: "0.75",
    },
    "&[data-exiting]": {
      fadeOut: "0",
      zoomOut: "0.75",
    },
  },
});

const StyledDialogContent = styled(DialogContent, {
  base: {
    zIndex: "300",
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
  },
});

const Buttons = styled("div", {
  base: {
    display: "flex",
    zIndex: "300",
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

export default Dialog;
