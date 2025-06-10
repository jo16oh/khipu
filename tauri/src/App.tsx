import "../index.css";

import { css } from "generated/styled-system/css";
import RootProviders from "./Providers";

function App() {
  return (
    <RootProviders>
      <main className="container">
        <p
          className={css({
            color: "purple.500",
            fontSize: "2xl",
            fontWeight: "bold",
            bg: "red.500",
          })}
        >
          Panda🐼
        </p>
      </main>
    </RootProviders>
  );
}

export default App;
