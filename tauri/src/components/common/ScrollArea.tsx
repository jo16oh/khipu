import { css } from "generated/styled-system/css";
import { SystemStyleObject } from "generated/styled-system/types";
import { PropsWithChildren, Ref } from "react";

type ScrollAreaProps = PropsWithChildren & {
  ref?: Ref<HTMLDivElement>;
  orientation?: "vertical" | "horizontal";
  type?: "auto" | "always";
  styleObject?: SystemStyleObject;
};

export default function ScrollArea({
  ref,
  children,
  orientation = "vertical",
  type = "auto",
  styleObject
}: ScrollAreaProps) {
  return (
    <div
      ref={ref!}
      className={`scroll-area ${css(areaStyle, styleObject)}`}
      data-orientation={orientation}
      data-scroll-type={type}
    >
      {children}
    </div>
  );
}

const areaStyle = css.raw({
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
});
