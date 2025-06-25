import { styled } from "generated/styled-system/jsx";
import { ComponentProps } from "react";

export default function TitlebarHandler({
  children,
  ...rest
}: ComponentProps<typeof StyledTitlebar>) {
  return (
    <StyledTitlebar data-tauri-drag-region {...rest}>
      {children}
    </StyledTitlebar>
  );
}

const StyledTitlebar = styled("div", {
  base: {
    display: "flex",
    w: "full",
    h: "[28px]",
  },
});
