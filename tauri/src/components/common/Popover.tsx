import { styled } from "generated/styled-system/jsx";
import { ComponentProps, ReactNode } from "react";
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
  contentProps?: ComponentProps<typeof StyledPopoverContent>;
  popoverProps?: ComponentProps<typeof StyledPopover>;
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
