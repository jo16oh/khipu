import "../index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { memoize } from "es-toolkit";
import { styled } from "generated/styled-system/jsx";
import { Suspense, use, useDeferredValue, useEffect } from "react";
import { Button } from "react-aria-components";
import { ErrorBoundary } from "react-error-boundary";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import Entry from "./components/Entry";
import Workspace from "./components/Workspace";
import { AppStateStoreContext, createAppStateStore } from "./stores/app-state-store";
import { StateStorage } from "./stores/state-storage";

const queryClient = new QueryClient();

const memoizedCreateAppStateStore = memoize(createAppStateStore);

function App() {
  return (
    <Main>
      <ErrorBoundary onError={(e) => console.error(e)} FallbackComponent={ErrorFallback}>
        <Suspense>
          <AppImpl />
        </Suspense>
      </ErrorBoundary>
    </Main>
  );
}

function AppImpl() {
  const appStateStore = use(memoizedCreateAppStateStore(StateStorage));

  const graphName = useStore(
    appStateStore,
    useShallow(({ graphName }) => graphName),
  );

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
    <AppStateStoreContext value={appStateStore}>
      <QueryClientProvider client={queryClient}>
        <Suspense>{defferedGraphName ? <Workspace /> : <Entry />}</Suspense>
      </QueryClientProvider>
    </AppStateStoreContext>
  );
}

function ErrorFallback() {
  return (
    <>
      <div>unhandled error</div>
      <Button onClick={() => window.location.reload()}>→ Click here to reload</Button>
    </>
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
