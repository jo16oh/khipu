import { StyledComponent, styled } from "generated/styled-system/jsx";
import { PropsWithChildren, Ref } from "react";

type StyleProps = Omit<StyledComponent<"div">, "ref">;
type ScrollAreaProps = PropsWithChildren &
  StyleProps & {
    ref?: Ref<HTMLDivElement>;
    orientation?: "vertical" | "horizontal";
    type?: "auto" | "always";
  };

export default function ScrollArea({
  ref,
  children,
  orientation = "vertical",
  type = "auto",
  ...props
}: ScrollAreaProps) {
  return (
    <Area ref={ref!} data-orientation={orientation} data-scroll-type={type} {...props}>
      {children}
    </Area>
  );
}

const Area = styled("div", {
  base: {
    w: "full",
    h: "full",
    _scrollbar: {
      rounded: "md",
      w: "[10px]",
      h: "[10px]",
      p: "[1px]",
      bg: "stone.300",
    },
    _scrollbarThumb: {
      border: "[2px solid transparent]",
      rounded: "[16px]",
      bg: "stone.500",
      bgClip: "padding-box",
    },
    _scrollbarTrack: {
      // eslint-disable-next-line @pandacss/no-margin-properties
      m: "[4px]",
    },
    "&[data-orientation=horizontal]": {
      "&[data-scroll-type=auto]": {
        overflowX: "auto",
      },
      "&[data-scroll-type=always]": {
        overflowX: "scroll",
      },
    },
    "&[data-orientation=vertical]": {
      "&[data-scroll-type=auto]": {
        overflowY: "auto",
      },
      "&[data-scroll-type=always]": {
        overflowY: "scroll",
      },
    },
  },
});
