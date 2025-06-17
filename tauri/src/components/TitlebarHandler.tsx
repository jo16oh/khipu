import { css } from "generated/styled-system/css";
import { ReactNode } from "react";

export default function TitlebarHandler({ children }: { children?: ReactNode }) {
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
