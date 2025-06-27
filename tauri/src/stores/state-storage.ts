import { LazyStore } from "@tauri-apps/plugin-store";

export const StateStorage = new LazyStore("state.json", { autoSave: true });
