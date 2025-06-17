import "../index.css";

import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { ReactNode } from "react";
import { Button } from "react-aria-components";
import { RootProviders } from "./Providers";

function App() {
  return (
    <RootProviders>
      <Root>
        <AppIcon>
          <img src="assets/khipu-icon.svg" className={css(imageStyle, { p: "4" })} />
          <img src="assets/khipu-app-name.svg" className={css(imageStyle, { pl: "2" })} />
          <div className={versionStyle}>v0.0.0</div>
        </AppIcon>
        <Operations>
          <Operation>Create New Database</Operation>
          <Operation>Open Database</Operation>
          <Operation>Setting</Operation>
        </Operations>
      </Root>
    </RootProviders>
  );
}

const Root = styled("main", {
  base: {
    display: "flex",
    gap: "16",
    flexDir: "column",
    justifyContent: "center",
    alignItems: "center",
    w: "screen",
    h: "screen",
    bg: "neutral.50",
    userSelect: "none",
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

export default App;
