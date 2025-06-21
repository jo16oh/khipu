import { styled } from "generated/styled-system/jsx";
import { ReactNode } from "react";
import {
  DialogRenderProps,
  DialogTrigger,
  DialogTriggerProps,
  Popover,
  Dialog as PopoverContent,
} from "react-aria-components";

const Dialog = ({
  trigger,
  triggerProps,
  content,
  contentProps,
  popoverProps,
}: {
  trigger: ReactNode;
  triggerProps?: DialogTriggerProps;
  content: (props: DialogRenderProps) => ReactNode;
  contentProps?: Parameters<typeof StyledPopoverContent>[0];
  popoverProps?: Parameters<typeof StyledPopover>[0];
}) => (
  <DialogTrigger {...triggerProps}>
    {trigger}

    <StyledPopover placement="bottom left" {...popoverProps}>
      <StyledPopoverContent {...contentProps}>{content}</StyledPopoverContent>
    </StyledPopover>
  </DialogTrigger>
);

const StyledPopover = styled(Popover, {
  base: {
    duration: "fast",
    "&[data-entering]": {
      fadeIn: "0",
    },
    "&[data-exiting]": {
      fadeOut: "0",
    },
  },
});

const StyledPopoverContent = styled(PopoverContent, {
  base: {
    cursor: "default",
    borderColor: "stone.200",
    rounded: "md",
    borderWidth: "thin",
    bg: "stone.50",
    shadow: "md",
  },
});

export default Dialog;
