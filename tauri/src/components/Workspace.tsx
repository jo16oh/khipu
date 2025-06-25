import { styled } from "generated/styled-system/jsx";
import { useAppState } from "src/stores/app-state-store";

export default function Workspace() {
  const appState = useAppState();

  return (
    <Container>
      workspace: {appState.graphName}
      <button onClick={() => appState.closeGraph()}>close {appState.graphName}</button>
    </Container>
  );
}

const Container = styled("div", {
  base: {
    display: "grid",
    w: "screen",
    h: "screen",
    bg: "stone.50",
    placeContent: "center",
  },
});
