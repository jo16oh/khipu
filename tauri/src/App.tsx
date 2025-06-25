import "../index.css";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LazyStore } from "@tauri-apps/plugin-store";
import { commands } from "generated/tauri-commands";
import { Suspense, use, useEffect, useState } from "react";
import { RootProviders } from "./Providers";
import Entry from "./components/Entry";
import TitlebarHandler from "./components/common/TitlebarHandler";
import { initAppStateStore, useAppState } from "./stores/app-state-store";
import { initWorkspaceState } from "./stores/workspace-state-store";
import Workspace from "./components/Workspace";

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
        .then(() => console.log("open graph successfully"))
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
      <main>
        <TitlebarHandler />
        <Suspense>{!isLoading && (graphName ? <Workspace /> : <Entry />)}</Suspense>
      </main>
    </RootProviders>
  );
}

export default App;
