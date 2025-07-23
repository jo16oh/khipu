import { styled } from "generated/styled-system/jsx";
import { circle, square } from "generated/styled-system/patterns";
import { Ellipsis } from "lucide-react";
import { ComponentProps } from "react";
import { Button } from "react-aria-components";
import Popover from "./Popover";

type Props = Omit<ComponentProps<typeof Popover>, "trigger"> & {
  orientation?: "horizontal" | "vertical";
  visibility?: "groupHover" | "hover" | "always";
};

const EllipsisMenu = ({
  orientation = "horizontal",
  visibility = "groupHover",
  ...props
}: Props) => (
  <Popover
    trigger={
      <StyledButton data-visibility={visibility}>
        <EllipsisIcon data-orientation={orientation} />
      </StyledButton>
    }
    {...props}
  />
);

const StyledButton = styled(Button, {
  base: circle.raw({
    display: "grid",
    rounded: "full",
    size: "6",
    color: "transparent",
    fontSize: "md",
    placeContent: "center",
    _hover: { bg: "stone.200" },
    "&[data-visibility='groupHover']": {
      _groupHover: { color: "stone.500" },
    },
    "&[data-visibility='hover']": {
      _hover: { color: "stone.500" },
    },
    "&[data-visibility='always']": {
      color: "stone.500",
    },
  }),
});

const EllipsisIcon = styled(Ellipsis, {
  base: square.raw({
    size: "5",
    "&[data-orientation=vertical]": {
      transform: "rotate(90deg)",
    },
  }),
});

export default EllipsisMenu;
