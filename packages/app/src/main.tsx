import { render } from "preact";
import App from "./App";

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed to exist in index.html
render(<App />, document.getElementById("root")!);
