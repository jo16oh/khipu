import "../index.css";

import { styled } from "generated/styled-system/jsx";
import { RootProviders } from "./Providers";
import Entry from "./components/Entry";

function App() {
  return (
    <RootProviders>
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
