import "../index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { Suspense, use, useDeferredValue, useEffect } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import Entry from "./components/Entry";
import Workspace from "./components/Workspace";
import { AppStateStoreContext, createAppStateStore } from "./stores/app-state-store";
import { StateStorage } from "./stores/state-storage";

const queryClient = new QueryClient();

function App() {
  const appStateStore = use(createAppStateStore(StateStorage));

  const [graphName, closeGraph] = useStore(
    appStateStore,
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
    appStateStore.subscribe((state, prevState) => {
      if (prevState.graphName && state.graphName === null) {
        queryClient.clear();
      }
    });
  }, [appStateStore]);

  useEffect(() => {
    getCurrentWebviewWindow().show();
  }, []);

  return (
    <Main>
      <AppStateStoreContext value={appStateStore}>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback="loading">{defferedGraphName ? <Workspace /> : <Entry />}</Suspense>
        </QueryClientProvider>
      </AppStateStoreContext>
    </Main>
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
