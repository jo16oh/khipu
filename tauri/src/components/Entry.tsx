import { getVersion } from "@tauri-apps/api/app";
import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { ReactNode, use, useMemo } from "react";
import { Button } from "react-aria-components";

function Entry() {
  const versionPromise = useMemo(() => getVersion(), []);
  const version = use(versionPromise);

  return (
    <Container>
      <AppIcon>
        <img src="assets/khipu-icon.svg" className={khipuIconStyle} />
        <img src="assets/khipu-app-name.svg" className={khipuLogoStyle} />
        <div className={versionStyle}>v{version}</div>
      </AppIcon>
      <Operations>
        <Operation>Create New Database</Operation>
        <Operation>Open Database</Operation>
        <Operation>Setting</Operation>
      </Operations>
    </Container>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    gap: "16",
    flexDir: "column",
    justifyContent: "center",
    alignItems: "center",
    w: "screen",
    h: "screen",
    bg: "neutral.50",
  },
});

const AppIcon = styled("div", {
  base: {
    display: "flex",
    flexDir: "column",
    justifyContent: "center",
    alignItems: "center",
    w: "52",
  },
});

const imageStyle = css.raw({
  userSelect: "none",
  pointerEvents: "none",
});

const khipuIconStyle = css(imageStyle, {
  p: "4",
  filter: "[drop-shadow(0px 4px 2px rgba(0, 0, 0, .25))]",
});

const khipuLogoStyle = css(imageStyle, {
  pl: "2",
});

const versionStyle = css({
  fontFamily: "mono",
  fontSize: "sm",
});

const Operations = styled("div", {
  base: {
    display: "flex",
    flexDir: "column",
    alignItems: "start",
  },
});

const Operation = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className={css({
        display: "flex",
        gap: "2",
        justifyContent: "start",
        alignItems: "center",
        p: "1",
      })}
    >
      <div className={css({ pb: "0.5", fontFamily: "mono", fontSize: "md" })}>◉</div>
      <Button
        className={css({
          fontFamily: "mono",
          fontSize: "md",
          _hover: {
            cursor: "pointer",
            textDecoration: "underline",
          },
        })}
      >
        {children}
      </Button>
    </div>
  );
};

export default Entry;
