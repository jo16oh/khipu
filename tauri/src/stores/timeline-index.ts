import { startOfDay } from "date-fns";
import { Outline } from "src/model";
import { OutlineStore } from "./outline-store";
import { SubscribersMap } from "./subscribers-map";

export type Order = "createdAt" | "updatedAt";

export class TimelineIndex {
  #store: OutlineStore;
  #createdAtIndex = new Map<number, Set<string>>();
  #updatedAtIndex = new Map<number, Set<string>>();
  #prevUpdatedDayMap = new Map<string, number>();
  #createdAtSubscribers = new SubscribersMap<number, []>();
  #updatedAtSubscribers = new SubscribersMap<number, []>();

  constructor(store: OutlineStore) {
    this.#store = store;
  }

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
    const currentUpdatedDayStart = startOfDay(outline.updatedAt).getTime();

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

    const outlineIdsUpdatedAtTheDay = this.#updatedAtIndex.get(currentUpdatedDayStart);
    if (outlineIdsUpdatedAtTheDay) {
      outlineIdsUpdatedAtTheDay.add(outline.id);
    } else {
      this.#updatedAtIndex.set(currentUpdatedDayStart, new Set([outline.id]));
    }

    this.#updatedAtSubscribers.notify(currentUpdatedDayStart);
  }

  get(timestamp: Date | number, order: Order) {
    const dayStart = startOfDay(timestamp).getTime();
    switch (order) {
      case "createdAt": {
        return this.#findSortedRootIds(Array.from(this.#createdAtIndex.get(dayStart) ?? []), order);
      }
      case "updatedAt": {
        return this.#findSortedRootIds(Array.from(this.#updatedAtIndex.get(dayStart) ?? []), order);
      }
    }
  }

  #findSortedRootIds(outlineIds: string[], order: Order) {
    const buf = new Map<string, Date>();

    const outlinesToTimestamp: Map<string, [Outline, Date]> = new Map(
      outlineIds
        .map((id) => this.#store.getOutline(id))
        .filter((o) => o !== undefined)
        .filter((o) => !o.deleted)
        .map((o) => [o.id, [o, o[order]]]),
    );

    this.#findRootIdsOfImpl(outlinesToTimestamp, order, buf);

    const result = Array.from(buf);
    result.sort(([_a, a], [_b, b]) => b.getTime() - a.getTime());

    return result.map(([id, _]) => id);
  }

  #findRootIdsOfImpl(
    outlineToDerivedTimestamp: Map<string, [Outline, Date]>,
    order: Order,
    buf: Map<string, Date>,
  ) {
    const parents: Map<string, [Outline, Date]> = new Map();

    for (const [_, [o, derivedDate]] of outlineToDerivedTimestamp) {
      if (o.parentId) {
        const parent = this.#store.getOutline(o.parentId);
        if (!parent) throw new Error(o.parentId);
        const newDerivedDate = parent[order] > derivedDate ? parent[order] : derivedDate;
        const value = parents.get(parent.id);
        if (!value || value[1] < newDerivedDate) parents.set(parent.id, [parent, newDerivedDate]);
      } else {
        const derivedDate2 = buf.get(o.id);
        if (!derivedDate2 || derivedDate2 < derivedDate) buf.set(o.id, derivedDate);
      }
    }

    if (parents.size > 0) {
      this.#findRootIdsOfImpl(parents, order, buf);
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
