import "../index.css";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { LazyStore } from "@tauri-apps/plugin-store";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { Suspense, use, useEffect, useState } from "react";
import { RootProviders } from "./Providers";
import Entry from "./components/Entry";
import TitlebarHandler from "./components/common/TitlebarHandler";
import { initAppStateStore, useAppState } from "./stores/app-state-store";
import { initWorkspaceState } from "./stores/workspace-state-store";

const stateStorage = new LazyStore("state.json", { autoSave: true });
const initAppStatePromise = initAppStateStore(stateStorage);
const initWorkspaceStatePromise = initWorkspaceState(stateStorage);

function App() {
  use(initAppStatePromise);
  use(initWorkspaceStatePromise);

  const dbName = useAppState((state) => state.dbName);
  const closeDb = useAppState((state) => state.closeDb);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (dbName) {
      commands
        .openDb(dbName)
        .then(() => console.log("open db successfully"))
        .catch((e) => {
          console.error(e);
          closeDb();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [dbName, closeDb]);

  useEffect(() => {
    getCurrentWebviewWindow().show();
  }, []);

  return (
    <RootProviders>
      <main>
        <TitlebarHandler />
        <Suspense fallback="loading...">
          {!isLoading && dbName ? (
            <Workspace>
              workspace: {dbName}
              <button onClick={() => closeDb()}>close {dbName}</button>
            </Workspace>
          ) : (
            <Entry />
          )}
        </Suspense>
      </main>
    </RootProviders>
  );
}

const Workspace = styled("div", {
  base: {
    display: "grid",
    w: "full",
    h: "full",
    bg: "pink.300",
    placeContent: "center",
  },
});

export default App;
