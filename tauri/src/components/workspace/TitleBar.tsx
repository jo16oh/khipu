import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { ComponentPropsWithoutRef } from "react";

export default function Titlebar({ children, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={containerStyle} data-tauri-drag-region {...props}>
      <MacOsTrafficLights />
      {children}
    </div>
  );
}

const containerStyle = css({
  display: "flex",
  justifyContent: "start",
  alignItems: "center",
  borderBottomWidth: "thin",
  borderBottomColor: "stone.200",
  w: "full",
  h: "10",
});

const MacOsTrafficLights = styled("div", {
  base: {
    w: "[5.375rem]",
    h: "full",
  },
});
