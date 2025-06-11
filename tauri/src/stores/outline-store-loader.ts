import { commands } from "generated/tauri-commands";
import { Outline } from "src/model";
import { OutlineStore } from "./outline-store";

type Commands = Pick<typeof commands, "tree">;

export class OutlineStoreLoader {
  readonly #store: OutlineStore;
  readonly #commands: Commands;

  constructor(store: OutlineStore, commands: Commands) {
    this.#store = store;
    this.#commands = commands;
  }

  async fetchTree(id: string) {
    const tree = await this.#commands.tree(id);
    const outlines = tree.map(Outline.from);
    this.#store.register(...outlines);
  }
}
