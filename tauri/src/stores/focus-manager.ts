import type { FocusPosition } from "@tiptap/react";

export type FocusState = {
  id: string;
  position: FocusPosition;
};

export class FocusManager {
  #state: FocusState | undefined;
  #focusFnMap = new Map<string, () => void>();

  /**
   * Focus to the outline specified by FocusState.
   * @param state - If ommited, focus to the last focused outline.
   */
  focus(state?: FocusState) {
    if (state === undefined) {
      if (this.#state) this.#focusFnMap.get(this.#state.id)?.();
    } else {
      this.#state = state;
      if (state) this.#focusFnMap.get(state.id)?.();
    }
  }

  current() {
    return this.#state;
  }

  /**
   * Call this method in Editor component to synchronize FocusState.
   * @param outlineId
   * @param focus - A function to focus to the editor.
   * @returns A function to sync cursor position to FocusManager (Don't use `focus` method for this purpose as it causes infinite loop).
   */
  manage(outlineId: string, focus: () => void) {
    this.#focusFnMap.set(outlineId, focus);
    return (state: FocusState) => {
      this.#state = state;
    };
  }

  unmanage(outlineId: string) {
    this.#focusFnMap.delete(outlineId);
  }
}
