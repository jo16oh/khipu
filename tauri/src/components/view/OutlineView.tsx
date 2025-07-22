import { styled } from "generated/styled-system/jsx";
import OutlineTreeEditor from "./OutlineTreeEditor";

export default function OutlineView({ id }: { id: string }) {
  return (
    <View>
      <OutlineTreeEditor id={id} />
    </View>
  );
}

const View = styled("div", {
  base: {
    maxW: "[46rem]",
    pl: "11",
    pr: "6",
    pt: "12",
    pb: "[50%]",
  },
});
