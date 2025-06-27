import "../index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { Suspense, use, useEffect, useState } from "react";
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (graphName) {
      commands
        .openGraph(graphName)
        .catch((e) => {
          console.error(e);
          closeGraph();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [graphName, closeGraph]);

  useEffect(() => {
    getCurrentWebviewWindow().show();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <styled.main display="flex" flexDir="column" w="screen" h="screen">
        <Suspense>{!isLoading && (graphName ? <Workspace /> : <Entry />)}</Suspense>
      </styled.main>
    </QueryClientProvider>
  );
}

export default App;
