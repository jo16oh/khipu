import { startOfDay } from "date-fns";
import { Outline } from "src/model";
import { SubscribersMap } from "./subscribers-map";

type Order = "createdAt" | "updatedAt";

export class TimelineIndex {
  #createdAtIndex = new Map<number, Set<string>>();
  #updatedAtIndex = new Map<number, Set<string>>();
  #prevUpdatedDayMap = new Map<string, number>();
  #createdAtSubscribers = new SubscribersMap<number, []>();
  #updatedAtSubscribers = new SubscribersMap<number, []>();

  set(outline: Outline) {
    if (!this.#prevUpdatedDayMap.has(outline.id)) this.#setCreatedAt(outline);
    this.#setUpdatedAt(outline);
  }

  #setCreatedAt(outline: Outline) {
    const createdDayStart = startOfDay(outline.createdAt).getTime();
    const outlineIdsCreatedAtTheDay = this.#createdAtIndex.get(createdDayStart);
    if (outlineIdsCreatedAtTheDay) {
      outlineIdsCreatedAtTheDay.add(outline.id);
    } else {
      this.#createdAtIndex.set(createdDayStart, new Set([outline.id]));
    }

    this.#createdAtSubscribers.notify(createdDayStart);
  }

  #setUpdatedAt(outline: Outline) {
    const prevUpdatedDayStart = this.#prevUpdatedDayMap.get(outline.id);
    const currentUpdatedDayStart = startOfDay(outline.createdAt).getTime();

    if (prevUpdatedDayStart === currentUpdatedDayStart) return;

    this.#prevUpdatedDayMap.set(outline.id, currentUpdatedDayStart);

    if (prevUpdatedDayStart !== undefined) {
      const set = this.#updatedAtIndex.get(prevUpdatedDayStart);
      if (set) {
        set.delete(outline.id);
        if (set.size === 0) this.#updatedAtIndex.delete(prevUpdatedDayStart);
      }

      this.#updatedAtSubscribers.notify(prevUpdatedDayStart);
    }

    const outlineIdsUpdatedAtTheDay = this.#createdAtIndex.get(currentUpdatedDayStart);
    if (outlineIdsUpdatedAtTheDay) {
      outlineIdsUpdatedAtTheDay.add(outline.id);
    } else {
      this.#updatedAtIndex.set(currentUpdatedDayStart, new Set([outline.id]));
    }

    this.#updatedAtSubscribers.notify(currentUpdatedDayStart);
  }

  get(dayStart: number, order: Order) {
    switch (order) {
      case "createdAt":
        return Array.from(this.#createdAtIndex.get(dayStart) ?? []);
      case "updatedAt":
        return Array.from(this.#updatedAtIndex.get(dayStart) ?? []);
    }
  }

  subscribe(dayStart: number, order: Order, cb: () => void) {
    switch (order) {
      case "createdAt": {
        this.#createdAtSubscribers.subscribe(dayStart, cb);
        return () => {
          this.#createdAtSubscribers.unsubscribe(dayStart, cb);
        };
      }
      case "updatedAt": {
        this.#updatedAtSubscribers.subscribe(dayStart, cb);
        return () => {
          this.#updatedAtSubscribers.unsubscribe(dayStart, cb);
        };
      }
    }
  }

  delete(outlineId: string, createdAt: Date) {
    const prevUpdatedDayStart = this.#prevUpdatedDayMap.get(outlineId);
    if (prevUpdatedDayStart) {
      const set = this.#updatedAtIndex.get(prevUpdatedDayStart);
      if (set) {
        set.delete(outlineId);
        if (set.size === 0) this.#updatedAtIndex.delete(prevUpdatedDayStart);
      }
    }

    const createdDayStart = startOfDay(createdAt).getTime();
    const set = this.#createdAtIndex.get(createdDayStart);
    if (set) {
      set.delete(outlineId);
      if (set.size === 0) this.#createdAtIndex.delete(createdDayStart);
    }
  }
}
