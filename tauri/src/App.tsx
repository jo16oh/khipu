import "../index.css";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { use, useEffect, useMemo } from "react";
import { RootProviders } from "./Providers";
import Entry from "./components/Entry";
import TitlebarHandler from "./components/TitlebarHandler";
import { useAppState } from "./stores/app-state-store";

function App() {
  const appState = useAppState();

  const openDb = useMemo(() => {
    return appState.dbName
      ? commands.openDb(appState.dbName).catch((e) => {
          console.warn(e);
          appState.closeDb();
        })
      : null;
  }, [appState]);

  if (openDb) use(openDb);

  useEffect(() => {
    getCurrentWebviewWindow().show();
  }, []);

  return (
    <RootProviders>
      <TitlebarHandler />
      <Main>{appState.dbName ? <div>workspace</div> : <Entry />}</Main>
    </RootProviders>
  );
}

const Main = styled("main", {
  base: {
    cursor: "default",
    userSelect: "none",
  },
});

export default App;
