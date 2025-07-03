export class SubscribersMap<Key, Args extends unknown[]> {
  #subscribers = new Map<Key, Set<(...args: Args) => void>>();
  #cleanupCallbacks = new Map<Key, Array<() => void>>();
  #cleanupDefer: number = 60 * 1000;

  constructor(cleanupDefer?: number) {
    if (cleanupDefer) this.#cleanupDefer = cleanupDefer;
  }

  subscribe(key: Key, listener: (...args: Args) => void) {
    const set = this.#subscribers.get(key);
    if (set) {
      set.add(listener);
    } else {
      this.#subscribers.set(key, new Set([listener]));
    }
  }

  unsubscribe(key: Key, cb: (...args: Args) => void) {
    const set = this.#subscribers.get(key);
    if (set) {
      set.delete(cb);
      setTimeout(() => {
        const set = this.#subscribers.get(key);
        if (set && set.size === 0) {
          this.#subscribers.delete(key);
          this.#cleanupCallbacks.get(key)?.forEach((cleanup) => cleanup());
          this.#cleanupCallbacks.delete(key);
        }
      }, this.#cleanupDefer);
    }
  }

  notify(key: Key, ...args: Args) {
    this.#subscribers.get(key)?.forEach((cb) => cb(...args));
  }

  onUnsubscribedAll(key: Key, cb: () => void) {
    const cleanupCallbacks = this.#cleanupCallbacks.get(key);
    if (cleanupCallbacks) {
      cleanupCallbacks.push(cb);
    } else {
      this.#cleanupCallbacks.set(key, [cb]);
    }
  }
}
