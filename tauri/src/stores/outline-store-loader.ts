import { OrderBy, TimelinePosition, commands } from "generated/tauri-commands";
import { Outline } from "src/model";
import { RegisterToStore } from "./outline-store";

type Commands = Pick<typeof commands, "tree" | "timeline">;

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

  async fetchTimeline(position: TimelinePosition, order: OrderBy) {
    const [dayStart, outlines]: [number, Outline[]] = await this.#commands
      .timeline(position, order)
      .then(({ dayStart, outlines }) => [dayStart, outlines.map(Outline.from)]);

    this.#registerToStore(...outlines);

    return outlines.length ? dayStart : null;
  }
}
