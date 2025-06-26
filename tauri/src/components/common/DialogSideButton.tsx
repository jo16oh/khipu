import { styled } from "generated/styled-system/jsx";
import { circle, square } from "generated/styled-system/patterns";
import { ComponentProps } from "react";
import { Button } from "react-aria-components";

const StyledButton = styled(Button, {
  base: circle.raw({
    display: "grid",
    borderColor: "stone.200",
    borderWidth: "thin",
    size: "8",
    bg: "white",
    shadow: "md",
    placeContent: "center",
    _hover: {
      bg: "stone.200",
    },
  }),
});

export default function DialogSideActionButton({
  children,
  ...rest
}: ComponentProps<typeof StyledButton>) {
  return (
    <StyledButton className="group" {...rest}>
      {children}
    </StyledButton>
  );
}

export const dialogSideActionButtonIconStyle = square.raw({
  size: "4",
  color: "stone.500",
});
