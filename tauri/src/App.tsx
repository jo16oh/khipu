import "../index.css";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LazyStore } from "@tauri-apps/plugin-store";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { Suspense, use, useEffect, useState } from "react";
import { RootProviders } from "./Providers";
import Entry from "./components/Entry";
import Workspace from "./components/Workspace";
import { initAppStateStore, useAppState } from "./stores/app-state-store";
import { initWorkspaceState } from "./stores/workspace-state-store";

const stateStorage = new LazyStore("state.json", { autoSave: true });
const initAppStatePromise = initAppStateStore(stateStorage);
const initWorkspaceStatePromise = initWorkspaceState(stateStorage);

function App() {
  use(initAppStatePromise);
  use(initWorkspaceStatePromise);

  const graphName = useAppState((state) => state.graphName);
  const closeGraph = useAppState((state) => state.closeGraph);
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
    <RootProviders>
      <styled.main display="flex" flexDir="column" w="screen" h="screen">
        <Suspense>{!isLoading && (graphName ? <Workspace /> : <Entry />)}</Suspense>
      </styled.main>
    </RootProviders>
  );
}

export default App;
