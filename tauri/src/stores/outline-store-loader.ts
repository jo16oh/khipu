import { commands } from "generated/tauri-commands";
import { Outline } from "src/model";
import { RegisterToStore } from "./outline-store";

type Commands = Pick<typeof commands, "tree">;

export class OutlineStoreLoader {
  readonly #registerToStore: RegisterToStore;
  readonly #commands: Commands;

  constructor(register: RegisterToStore, commands: Commands) {
    this.#registerToStore = register;
    this.#commands = commands;
  }

  async fetchTree(id: string) {
    const tree = await this.#commands.tree(id);
    const outlines = tree.map(Outline.from);
    this.#registerToStore(...outlines);
  }
}
