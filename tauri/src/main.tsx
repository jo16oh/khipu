import { Grid } from "generated/styled-system/jsx";
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={({ error }) => {
        console.error(error);
        return (
          <Grid w="screen" h="screen" placeContent="center">
            unhandled error
          </Grid>
        );
      }}
    >
      <Suspense>
        <App />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
);
