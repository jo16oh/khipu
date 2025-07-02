import "../index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { Suspense, use, useDeferredValue, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import Entry from "./components/Entry";
import Workspace from "./components/Workspace";
import { initAppStateStore, useAppState } from "./stores/app-state-store";

const initAppStatePromise = initAppStateStore();
const queryClient = new QueryClient();

function App() {
  use(initAppStatePromise);

  const [graphName, closeGraph] = useAppState(
    useShallow(({ graphName, closeGraph }) => [graphName, closeGraph]),
  );

  useEffect(() => {
    if (graphName) {
      commands.openGraph(graphName).catch((e) => {
        console.error(e);
        closeGraph();
      });
    }
  }, [graphName, closeGraph]);

  const defferedGraphName = useDeferredValue(graphName);

  useEffect(() => {
    useAppState.subscribe((state, prevState) => {
      if (prevState.graphName && state.graphName === null) {
        queryClient.clear();
      }
    });
  }, []);

  useEffect(() => {
    getCurrentWebviewWindow().show();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Main>
        <Suspense fallback="loading">{defferedGraphName ? <Workspace /> : <Entry />}</Suspense>
      </Main>
    </QueryClientProvider>
  );
}

const Main = styled("main", {
  base: {
    display: "flex",
    flexDir: "column",
    w: "screen",
    h: "screen",
    bg: "stone.50",
  },
});

export default App;
