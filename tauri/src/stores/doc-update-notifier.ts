import type { JSONContent } from "@tiptap/react";
import { createContext, use } from "react";
import { SubscribersMap } from "./subscribers-map";

export const DocUpdateNotifierContext = createContext<DocUpdateNotifier | null>(null);

export function useDocUpdateNotifier() {
  const context = use(DocUpdateNotifierContext);
  if (!context) throw new Error("DocUpdateNotifierContext is not set");
  return context;
}

export class DocUpdateNotifier {
  #subscribers = new SubscribersMap<string, [doc: JSONContent]>();

  subscribe(id: string, cb: (doc: JSONContent) => void) {
    this.#subscribers.subscribe(id, cb);
    return () => {
      this.#subscribers.unsubscribe(id, cb);
    };
  }

  notify(id: string, doc: JSONContent) {
    this.#subscribers.notify(id, doc);
  }
}
