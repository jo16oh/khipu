import { css } from "generated/styled-system/css";
import { PropsWithChildren } from "react";

export default function TitlebarHandler({ children }: PropsWithChildren) {
  return (
    <div
      data-tauri-drag-region
      className={css({
        zIndex: 9999,
        pos: "fixed",
        top: "0",
        left: "0",
        w: "full",
        h: "[28px]",
      })}
    >
      {children}
    </div>
  );
}
