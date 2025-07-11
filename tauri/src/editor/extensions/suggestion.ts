import { EditorState, PluginKey } from "@tiptap/pm/state";
import { InternalLinkSuggestionPluginKey } from "./internal-link";

export type SuggestionPluginState = {
  active: boolean;
};

export function isSuggestionActive(state: EditorState) {
  const plugins: PluginKey<SuggestionPluginState>[] = [InternalLinkSuggestionPluginKey];
  return plugins.some((key) => key.getState(state)?.active);
}
