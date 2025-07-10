import { commands, OrderBy, TimelinePosition } from "generated/tauri-commands";
import { Outline } from "src/model";
import { RegisterToStore } from "./outline-store";

type Commands = Pick<
  typeof commands,
  "tree" | "timeline" | "search" | "inboundLinks" | "outboundLinks" | "excerpt" | "suggest"
>;

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
    return null;
  }

  async fetchTimeline(position: TimelinePosition, order: OrderBy) {
    const [dayStart, outlines]: [number, Outline[]] = await this.#commands
      .timeline(position, order)
      .then(({ dayStart, outlines }) => [dayStart, outlines.map(Outline.from)]);

    this.#registerToStore(...outlines);

    return outlines.length ? dayStart : null;
  }

  async fetchSearchResults(query: string, orderBy: OrderBy, offset: number) {
    const [results, links]: [Outline[], Outline[]] = await this.#commands
      .search(query, orderBy, offset)
      .then(([results, links]) => [results.map(Outline.from), links.map(Outline.from)]);

    this.#registerToStore(...results, ...links);

    return results.map((r) => r.id);
  }

  async fetchSuggestion(query: string) {
    if (query.trim().length === 0) return [];

    const [results, links]: [Outline[], Outline[]] = await this.#commands
      .suggest(query)
      .then(([results, links]) => [results.map(Outline.from), links.map(Outline.from)]);

    this.#registerToStore(...results, ...links);

    return results.map((r) => r.id);
  }

  async fetchInboundLinks(id: string, offset: number) {
    const [results, links]: [Outline[], Outline[]] = await this.#commands
      .inboundLinks(id, offset)
      .then(([results, links]) => [results.map(Outline.from), links.map(Outline.from)]);

    this.#registerToStore(...results, ...links);

    return results.map((r) => r.id);
  }

  async fetchOutboundLinks(id: string) {
    const results: Outline[] = await this.#commands
      .outboundLinks(id)
      .then((results) => results.map(Outline.from));

    this.#registerToStore(...results);

    return results.map((r) => r.id);
  }

  async fetchExcerpt(id: string) {
    const excerpt = await this.#commands.excerpt(id).then((results) => results.map(Outline.from));

    this.#registerToStore(...excerpt);

    return excerpt.map((r) => r.id);
  }
}
