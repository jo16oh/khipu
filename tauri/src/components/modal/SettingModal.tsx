import { css } from "generated/styled-system/css";
import { ReactNode } from "react";
import { Button } from "react-aria-components";
import Dialog from "../common/Dialog";

export default function SettingModal({ trigger }: { trigger: ReactNode }) {
  return (
    <Dialog
      trigger={trigger}
      content={({ close }) => (
        <>
          <p>このダイアログはオーバーレイのクリックで閉じられます。</p>
          <Button
            className={css({
              cursor: "pointer",
              alignSelf: "flex-end",
              rounded: "md",
              p: "2",
              color: "white",
              bg: "blue.500",
              _hover: { bg: "blue.600" },
            })}
            onPress={close}
          >
            Close
          </Button>
        </>
      )}
    />
  );
}
