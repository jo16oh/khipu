import type { JSONContent } from "@tiptap/react";
import { SubscribersMap } from "./subscribers-map";

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
