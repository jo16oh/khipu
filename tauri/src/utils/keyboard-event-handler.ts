import { Key } from "ts-keycode-enum";

export type ModifierKey = "meta" | "alt" | "ctrl" | "shift";

export type KeyDefinition =
  | [Key]
  | [Key, ModifierKey[]]
  | [Key, ModifierKey[], ModifierKey[]]
  | [Key, ModifierKey[], "any"];

type Args = readonly unknown[];

export type KeyboardEventHandler<T extends Args = []> = {
  on: KeyDefinition;
  fn: (event: KeyboardEvent, ...args: T) => void | boolean | Promise<void>;
};

export function runKeyboardEventHandlerIfMatches<T extends Args>(
  event: KeyboardEvent,
  handler: KeyboardEventHandler<T>,
  ...args: T
) {
  const { on, fn } = handler;
  const [key, mandatory, optional] = on;

  if (event.keyCode !== key) return;

  if (mandatory) {
    for (const mod of mandatory) {
      switch (mod) {
        case "meta":
          if (!event.metaKey) return;
          break;
        case "alt":
          if (!event.altKey) return;
          break;
        case "ctrl":
          if (!event.ctrlKey) return;
          break;
        case "shift":
          if (!event.shiftKey) return;
          break;
      }
    }
  }

  if (optional === "any") {
    return fn(event, ...args);
  } else {
    const mandatoryMods = new Set(mandatory);
    const optionalMods = new Set(optional);
    if (event.metaKey && !mandatoryMods.has("meta") && !optionalMods.has("meta")) return;
    if (event.altKey && !mandatoryMods.has("alt") && !optionalMods.has("alt")) return;
    if (event.ctrlKey && !mandatoryMods.has("ctrl") && !optionalMods.has("ctrl")) return;
    if (event.shiftKey && !mandatoryMods.has("shift") && !optionalMods.has("shift")) return;
    return fn(event, ...args);
  }
}
