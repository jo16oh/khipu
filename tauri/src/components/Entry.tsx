import { useSuspenseQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { Button } from "react-aria-components";
import BulletButton from "./common/BulletButton";
import CreateOrRenameDatabaseModal from "./modal/CreateOrRenameDatabaseModal";
import OpenDatabaseModal from "./modal/OpenDatabaseModal";
import SettingModal from "./modal/SettingModal";

function Entry() {
  const { data: version } = useSuspenseQuery({
    queryKey: ["version"],
    queryFn: async () => {
      return await getVersion();
    },
  });

  return (
    <Container>
      <AppIconContainer>
        <img src="assets/khipu-icon.svg" className={khipuIconStyle} />
        <img src="assets/khipu-app-name.svg" className={khipuLogoStyle} />
        <div className={versionStyle}>v{version}</div>
      </AppIconContainer>
      <Operations>
        <CreateOrRenameDatabaseModal
          kind="create"
          trigger={<OperationTrigger text="Create New Database" />}
        />
        <OpenDatabaseModal trigger={<OperationTrigger text="Open Database" />} />
        <SettingModal trigger={<OperationTrigger text="Setting" />} />
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
  },
});

const AppIconContainer = styled("div", {
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

const OperationTrigger = ({ text }: { text: string }) => (
  <div className={css({ display: "flex", gap: "2", alignItems: "center", p: "1" })}>
    <BulletButton isCollapsed={true} isDisabled={false} />
    <Button
      className={css({
        color: "stone.900",
        _hover: { cursor: "pointer", textDecoration: "underline" },
      })}
    >
      {text}
    </Button>
  </div>
);

export default Entry;
