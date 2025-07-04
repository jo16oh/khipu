import { useSuspenseQueries } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { Button } from "react-aria-components";
import KhipuAppName from "src/icons/khipu-app-name";
import KhipuIcon from "src/icons/khipu-icon";
import Bullet from "./common/Bullet";
import TitlebarHandler from "./common/TitlebarHandler";
import CreateOrRenameGraphModal from "./modal/CreateOrRenameGraphModal";
import OpenGraphModal from "./modal/OpenGraphModal";
import SettingModal from "./modal/SettingModal";

function Entry() {
  const [{ data: version }, { data: graphList }] = useSuspenseQueries({
    queries: [
      {
        queryKey: ["version"],
        queryFn: getVersion,
      },
      {
        queryKey: ["graphList"],
        queryFn: commands.listGraph,
      },
    ],
  });

  return (
    <>
      <TitlebarHandler />
      <Container>
        <AppIconContainer>
          <KhipuIcon className={khipuIconStyle} />
          <KhipuAppName className={KhipuAppNameStyle} />
          <Version>v{version}</Version>
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

const KhipuAppNameStyle = css(imageStyle, {
  pl: "2",
});

const Version = styled("div", {
  base: {
    fontFamily: "mono",
    fontSize: "sm",
  },
});

const Operations = styled("div", {
  base: {
    display: "flex",
    flexDir: "column",
    alignItems: "start",
  },
});

const OperationTrigger = ({ text, isDisabled = false }: { text: string; isDisabled?: boolean }) => (
  <OperationContainer>
    <Bullet isCollapsed={!isDisabled} isDisabled={true} />
    <OperationTextButton isDisabled={isDisabled}>{text}</OperationTextButton>
  </OperationContainer>
);

const OperationContainer = styled("div", {
  base: { display: "flex", gap: "2", alignItems: "center", p: "1" },
});

const OperationTextButton = styled(Button, {
  base: {
    color: "stone.900",
    _disabled: {
      color: "stone.400",
      textDecoration: "line-through",
      _hover: { cursor: "default", textDecoration: "line-through" },
    },
    _hover: { cursor: "pointer", textDecoration: "underline" },
  },
});

export default Entry;
