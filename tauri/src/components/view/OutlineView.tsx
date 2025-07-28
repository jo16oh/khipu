import { styled } from "generated/styled-system/jsx";
import OutlineEditorTree from "./OutlineEditorTree";

export default function OutlineView({ id }: { id: string }) {
  return (
    <View>
      <OutlineEditorTree id={id} />
    </View>
  );
}

const View = styled("div", {
  base: {
    w: "full",
    maxW: "[46rem]",
    pl: "12",
    pr: "6",
    pt: "12",
    pb: "56",
  },
});
