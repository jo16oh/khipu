export type FractionallyIndexedItem = {
  id: string;
  findex: string;
};

export class FractionallyIndexedList<T extends FractionallyIndexedItem> {
  #array: T[] = [];

  static from<T extends FractionallyIndexedItem>(
    iterable: Iterable<T>,
  ): FractionallyIndexedList<T> {
    const list = new FractionallyIndexedList<T>();
    const arr: T[] = Array.from(
      new Map(Array.from(iterable, (i) => [i.id, i])).values(),
    );

    arr.sort((a, b) => {
      if (a.findex < b.findex) {
        return -1;
      }
      if (a.findex > b.findex) {
        return 1;
      }

      if (a.id < b.id) {
        return -1;
      }
      if (a.id > b.id) {
        return 1;
      }
      return 0;
    });

    list.#array = arr;

    return list;
  }

  delete(id: string) {
    const idx = this.#array.findIndex((i) => i.id === id);
    if (idx !== -1) this.#array.splice(idx, 1);
  }

  insert(item: T) {
    if (this.#array.length === 0) {
      this.#array.push(item);
    } else {
      let low = 0;
      let high = this.#array.length;

      while (low < high) {
        const mid = (low + high) >>> 1;

        if (this.#array[mid]!.findex < item.findex) {
          low = mid + 1;
        } else if (this.#array[mid]!.findex > item.findex) {
          high = mid;
        } else {
          if (this.#array[mid]!.id < item.id) {
            low = mid + 1;
          } else if (this.#array[mid]!.id > item.id) {
            high = mid;
          } else {
            return;
          }
        }
      }

      this.#array.splice(low, 0, item);
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.#array[Symbol.iterator]();
  }

  get size(): number {
    return this.#array.length;
  }
}
