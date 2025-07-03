import type { FocusPosition } from "@tiptap/react";
import { memoize } from "es-toolkit";
import { createContext, use } from "react";

export const FocusManagerContext = createContext<FocusManager | undefined>(undefined);

export function useFocusManager() {
  const context = use(FocusManagerContext);
  if (!context) throw new Error("FocusManagerContext is not set");
  return context;
}

export type FocusState = {
  id: string;
  position: FocusPosition;
};

export class FocusManager {
  static create = memoize((graphName: string) => {
    if (!this.create.cache.has(graphName)) this.create.cache.clear();
    return new FocusManager();
  });

  private constructor() {}

  #state: FocusState | undefined;
  #focusFnMap = new Map<string, (pos: FocusPosition) => void>();

  syncFocusPosition(state: FocusState) {
    this.#state = state;
  }

  focus(state: "prev" | FocusState) {
    if (state === "prev") {
      if (this.#state) this.#focusFnMap.get(this.#state.id)?.(this.#state.position);
    } else {
      this.#state = state;
      this.#focusFnMap.get(state.id)?.(state.position);
    }
  }

  current() {
    return this.#state;
  }

  manage(outlineId: string, focus: (pos: FocusPosition) => void) {
    this.#focusFnMap.set(outlineId, focus);
    return () => {
      this.#focusFnMap.delete(outlineId);
    };
  }
}
