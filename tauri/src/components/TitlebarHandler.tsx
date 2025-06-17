import { css } from "generated/styled-system/css";
import { PropsWithChildren } from "react";

export default function TitlebarHandler({ children }: PropsWithChildren) {
  return (
    <div
      data-tauri-drag-region
      className={css({
        zIndex: "10",
        pos: "fixed",
        w: "full",
        h: "[28px]",
        userSelect: "none",
      })}
    >
      {children}
    </div>
  );
}
