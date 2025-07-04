import { LazyStore } from "@tauri-apps/plugin-store";
import { memoize } from "es-toolkit";
import { styled } from "generated/styled-system/jsx";
import { commands } from "generated/tauri-commands";
import { PropsWithChildren, use, useDeferredValue } from "react";
import { useAppState } from "src/stores/app-state-store";
import { DocUpdateNotifier, DocUpdateNotifierContext } from "src/stores/doc-update-notifier";
import { FocusManager, FocusManagerContext } from "src/stores/focus-manager";
import { OutlineStore, OutlineStoreContext } from "src/stores/outline-store";
import { StateStorage } from "src/stores/state-storage";
import { ViewStateStoreContext } from "src/stores/view-state-store";
import {
  createWorkspaceStateStore,
  useWorkspaceState,
  WorkspaceStateStore,
  WorkspaceStateStoreContext,
} from "src/stores/workspace-state-store";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import TitlebarHandler from "./common/TitlebarHandler";
import Dock from "./workspace/Dock";
import Stage from "./workspace/Stage";

type Commands = typeof commands;

const memoizedCreateDocUpdateNotifier = memoize((graphName: string) => {
  if (!memoizedCreateDocUpdateNotifier.cache.has(graphName)) {
    memoizedCreateDocUpdateNotifier.cache.clear();
  }
  return new DocUpdateNotifier();
});

const memoizedCreateFocusManager = memoize((graphName: string) => {
  if (!memoizedCreateFocusManager.cache.has(graphName)) memoizedCreateFocusManager.cache.clear();
  return new FocusManager();
});

const memoizedCreateWorkspaceStateStore = memoize(
  (args: { graphName: string; stateStorage?: LazyStore }) => {
    if (!memoizedCreateWorkspaceStateStore.cache.has(args.graphName)) {
      memoizedCreateWorkspaceStateStore.cache.clear();
    }

    return createWorkspaceStateStore(args);
  },
  {
    getCacheKey: ({ graphName }) => graphName,
  },
);

const memoizedCreateOutlineStore = memoize(
  ({
    graphName,
    docUpdateNotifier,
    workspaceStateStore,
    commands,
  }: {
    graphName: string;
    docUpdateNotifier: DocUpdateNotifier;
    workspaceStateStore: WorkspaceStateStore;
    commands: Commands;
  }) => {
    if (!memoizedCreateOutlineStore.cache.has(graphName)) memoizedCreateOutlineStore.cache.clear();
    return new OutlineStore(docUpdateNotifier, workspaceStateStore, commands);
  },
  {
    getCacheKey: (args) => args.graphName,
  },
);

export default function Workspace() {
  const graphName = useAppState(useShallow(({ graphName }) => graphName));

  return graphName ? (
    <Providers graphName={graphName}>
      <WorkspaceImpl />
    </Providers>
  ) : null;
}

function Providers({ graphName, children }: { graphName: string } & PropsWithChildren) {
  const docUpdateNotifier = memoizedCreateDocUpdateNotifier(graphName);
  const focusManager = memoizedCreateFocusManager(graphName);
  const workspaceStateStore = use(
    memoizedCreateWorkspaceStateStore({ graphName, stateStorage: StateStorage }),
  );
  const outlineStore = memoizedCreateOutlineStore({
    graphName,
    docUpdateNotifier,
    workspaceStateStore,
    commands,
  });

  const stage = useStore(
    workspaceStateStore,
    useShallow(({ stage }) => stage),
  );

  return (
    <WorkspaceStateStoreContext value={workspaceStateStore}>
      <ViewStateStoreContext value={stage}>
        <DocUpdateNotifierContext value={docUpdateNotifier}>
          <OutlineStoreContext value={outlineStore}>
            <FocusManagerContext value={focusManager}>{children}</FocusManagerContext>
          </OutlineStoreContext>
        </DocUpdateNotifierContext>
      </ViewStateStoreContext>
    </WorkspaceStateStoreContext>
  );
}

function WorkspaceImpl() {
  const [graphName, closeGraph] = useAppState(
    useShallow(({ graphName, closeGraph }) => [graphName, closeGraph]),
  );

  const focus = useWorkspaceState(useShallow(({ focus }) => focus));

  const defferedFocus = useDeferredValue(focus);

  return graphName ? (
    <>
      <TitlebarHandler />
      <Container>
        {defferedFocus === "timeline" && <div>timeline</div>}
        {defferedFocus === "search" && <div>search</div>}
        {defferedFocus === "stage" && <Stage />}
        <button onClick={closeGraph}>close {graphName}</button>
      </Container>
      <Dock />
    </>
  ) : (
    <></>
  );
}

const Container = styled("div", {
  base: {
    display: "grid",
    flex: "1",
    placeContent: "center",
  },
});
