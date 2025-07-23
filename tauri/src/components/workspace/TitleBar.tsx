import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { LogOut } from "lucide-react";
import { ComponentPropsWithoutRef } from "react";
import { Button } from "react-aria-components";
import { useAppState } from "src/stores/app-state-store";
import EllipsisMenu from "../common/EllipsisMenu";

export default function Titlebar({ children, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={containerStyle} data-tauri-drag-region {...props}>
      <MacOsTrafficLights />
      {children}
      <RightSideButtons className="group" data-tauri-drag-region>
        <EllipsisMenu
          orientation="vertical"
          visibility="always"
          content={() => <EllipsisMenuContent />}
        />
      </RightSideButtons>
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

const RightSideButtons = styled("div", {
  base: {
    display: "flex",
    flex: "1",
    justifyContent: "end",
    alignItems: "center",
    h: "full",
    px: "2",
  },
});

const EllipsisMenuContent = () => {
  const closeGraph = useAppState((state) => state.closeGraph);

  return (
    <MenuItems>
      <MenuItem onClick={closeGraph}>
        <LogOutIcon />
        <div>Exit current graph</div>
      </MenuItem>
    </MenuItems>
  );
};

const MenuItems = styled("div", {
  base: {
    display: "flex",
    gap: "1",
    flexDir: "column",
    p: "1",
  },
});

const LogOutIcon = styled(LogOut, {
  base: {
    w: "4",
    h: "4",
  },
});

const MenuItem = styled(Button, {
  base: {
    display: "flex",
    gap: "2",
    alignItems: "center",
    rounded: "md",
    p: "1",
    fontSize: "sm",
    _hover: {
      bg: "stone.200",
    },
  },
});
