import { styled } from "generated/styled-system/jsx";
import { circle, square } from "generated/styled-system/patterns";
import { Ellipsis } from "lucide-react";
import { ComponentProps } from "react";
import { Button } from "react-aria-components";
import Popover from "./Popover";

const EllipsisMenu = (props: Omit<ComponentProps<typeof Popover>, "trigger">) => (
  <Popover
    trigger={
      <StyledButton>
        <EllipsisIcon />
      </StyledButton>
    }
    {...props}
  />
);

const StyledButton = styled(Button, {
  base: circle.raw({
    display: "grid",
    rounded: "full",
    size: "5",
    color: "transparent",
    fontSize: "md",
    placeContent: "center",
    _hover: { bg: "stone.200" },
    _groupHover: { color: "stone.500" },
  }),
});

const EllipsisIcon = styled(Ellipsis, {
  base: square.raw({
    size: "4",
  }),
});

export default EllipsisMenu;
