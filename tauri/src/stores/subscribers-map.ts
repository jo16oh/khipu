export class SubscribersMap<Args extends unknown[]> {
  #map = new Map<string, Set<(...args: Args) => void>>();
  #cleanupCallbacks = new Map<string, Array<() => void>>();

  subscribe(id: string, listener: (...args: Args) => void) {
    const set = this.#map.get(id);
    if (set) {
      set.add(listener);
    } else {
      this.#map.set(id, new Set([listener]));
    }
  }

  unsubscribe(id: string, cb: (...args: Args) => void) {
    const set = this.#map.get(id);
    if (set) {
      set.delete(cb);
      if (set.size === 0) {
        this.#map.delete(id);
        this.#cleanupCallbacks.get(id)?.forEach((cleanup) => cleanup());
        this.#cleanupCallbacks.delete(id);
      }
    }
  }

  notify(id: string, ...args: Args) {
    this.#map.get(id)?.forEach((cb) => cb(...args));
  }

  onUnsubscribedAll(id: string, cb: () => void) {
    const set = this.#cleanupCallbacks.get(id);
    if (set) {
      set.push(cb);
    } else {
      this.#cleanupCallbacks.set(id, [cb]);
    }
  }
}
