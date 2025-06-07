import { generateKeyBetween } from "fractional-indexing-jittered";

export type FractionallyIndexedItem = {
  id: string;
  findex: string;
};

export class FractionallyIndexedList<T extends FractionallyIndexedItem> {
  #array: T[] = [];

  /**
   * Static method to compare two items.
   * Compares in ascending order with findex as the primary key and id as the secondary key.
   * This ensures consistent ordering for sorting and binary search.
   * @returns negative value if a < b, positive value if a > b, 0 if a === b
   */
  static #compare(a: { findex: string; id: string }, b: { findex: string; id: string }): number {
    if (a.findex < b.findex) return -1;
    if (a.findex > b.findex) return 1;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  }

  /**
   * Private method that uses binary search to find the index of the specified item.
   * @param item The item to search for
   * @returns `index`: The index of the item (or insertion point if not found), `found`: Boolean indicating whether an exact match was found
   */
  #findIndex(item: { findex: string; id: string }): {
    index: number;
    found: boolean;
  } {
    let low = 0;
    let high = this.#array.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      const comparison = FractionallyIndexedList.#compare(this.#array[mid]!, item);

      if (comparison < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    const found =
      low < this.#array.length && FractionallyIndexedList.#compare(this.#array[low]!, item) === 0;

    return { index: low, found };
  }

  static from<T extends FractionallyIndexedItem>(
    iterable: Iterable<T>,
  ): FractionallyIndexedList<T> {
    const list = new FractionallyIndexedList<T>();
    const arr: T[] = Array.from(new Map(Array.from(iterable, (i) => [i.id, i])).values());

    arr.sort(FractionallyIndexedList.#compare);

    list.#array = arr;
    return list;
  }

  delete(id: string) {
    const idx = this.#array.findIndex((i) => i.id === id);
    if (idx !== -1) this.#array.splice(idx, 1);
  }

  insert(item: T) {
    const { index, found } = this.#findIndex(item);

    if (!found) {
      this.#array.splice(index, 0, item);
    }
  }

  intoArray() {
    return Array.from(this.#array);
  }

  generateFractionalIndex(position: "start" | "end" | { after: T }): string {
    if (position === "start") {
      const upper = this.#array[0]?.findex ?? null;
      return generateKeyBetween(null, upper);
    } else if (position === "end") {
      const lower = this.#array.at(-1)?.findex ?? null;
      return generateKeyBetween(lower, null);
    } else {
      const { index, found } = this.#findIndex(position.after);

      if (!found) {
        throw new Error("The item specified in 'after' was not found in the list.");
      }

      const lower = this.#array[index]!.findex;
      const upper = this.#array[index + 1]?.findex ?? null;
      return generateKeyBetween(lower, upper);
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.#array[Symbol.iterator]();
  }

  get size(): number {
    return this.#array.length;
  }
}
