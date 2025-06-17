import "../index.css";

import { styled } from "generated/styled-system/jsx";
import { RootProviders } from "./Providers";
import Entry from "./components/Entry";
import TitlebarHandler from "./components/TitlebarHandler";

function App() {
  return (
    <RootProviders>
      <TitlebarHandler />
      <Main>
        <Entry />
      </Main>
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
