import { useSuspenseQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { Button } from "react-aria-components";
import BulletButton from "./common/BulletButton";
import CreateOrRenameGraphModal from "./modal/CreateOrRenameGraphModal";
import OpenGraphModal from "./modal/OpenGraphModal";
import SettingModal from "./modal/SettingModal";
import { commands } from "generated/tauri-commands";
import TitlebarHandler from "./common/TitlebarHandler";

function Entry() {
  const { data: version } = useSuspenseQuery({
    queryKey: ["version"],
    queryFn: async () => {
      return await getVersion();
    },
  });

  const { data: graphList } = useSuspenseQuery({
    queryKey: ["graphList"],
    queryFn: commands.listGraph,
  });

  return (
    <>
      <TitlebarHandler bg="stone.50" />
      <Container>
        <AppIconContainer>
          <img src="assets/khipu-icon.svg" className={khipuIconStyle} />
          <img src="assets/khipu-app-name.svg" className={khipuLogoStyle} />
          <div className={versionStyle}>v{version}</div>
        </AppIconContainer>
        <Operations>
          <CreateOrRenameGraphModal
            kind="create"
            trigger={<OperationTrigger text="Create New Graph" />}
          />
          <OpenGraphModal
            trigger={<OperationTrigger text="Open Graph" isDisabled={graphList.length === 0} />}
          />
          <SettingModal trigger={<OperationTrigger text="Setting" />} />
        </Operations>
      </Container>
    </>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    flex: "1",
    gap: "16",
    flexDir: "column",
    justifyContent: "center",
    alignItems: "center",
    bg: "stone.50",
  },
});

const AppIconContainer = styled("div", {
  base: {
    display: "flex",
    flexDir: "column",
    justifyContent: "center",
    alignItems: "center",
    w: "52",
    h: "52",
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

const OperationTrigger = ({ text, isDisabled = false }: { text: string; isDisabled?: boolean }) => (
  <div className={css({ display: "flex", gap: "2", alignItems: "center", p: "1" })}>
    <BulletButton isCollapsed={!isDisabled} isDisabled={isDisabled} />
    <Button
      className={css({
        color: "stone.900",
        _disabled: {
          color: "stone.400",
          textDecoration: "line-through",
          _hover: { cursor: "default", textDecoration: "line-through" },
        },
        _hover: { cursor: "pointer", textDecoration: "underline" },
      })}
      isDisabled={isDisabled}
    >
      {text}
    </Button>
  </div>
);

export default Entry;
