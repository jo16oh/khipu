import { describe, expect, it } from "vitest";
import { type FractionallyIndexedItem, FractionallyIndexedList } from "./utils";

interface TestItem extends FractionallyIndexedItem {
  name: string;
}

describe("FractionallyIndexedList", () => {
  const item1: TestItem = { id: "a", findex: "a0", name: "Apple" };
  const item2: TestItem = { id: "b", findex: "b0", name: "Banana" };
  const item3: TestItem = { id: "c", findex: "c0", name: "Cherry" };
  const item4: TestItem = { id: "d", findex: "b5", name: "Date" }; // Same findex as item2 but different id
  const item5: TestItem = { id: "e", findex: "b0", name: "Elderberry" }; // Same findex as item2, different id

  // Helper to convert list to array for easier inspection
  const toArray = <T extends FractionallyIndexedItem>(list: FractionallyIndexedList<T>): T[] => {
    return Array.from(list);
  };

  // --- FractionallyIndexedList.from ---
  describe("static from()", () => {
    it("should create an empty list from an empty iterable", () => {
      const list = FractionallyIndexedList.from<TestItem>([]);
      expect(list.size).toBe(0);
      expect(toArray(list)).toEqual([]);
    });

    it("should create a list and sort items by findex, then by id", () => {
      const items: TestItem[] = [
        { id: "z", findex: "c0", name: "Zulu" },
        { id: "x", findex: "a0", name: "Xray" },
        { id: "y", findex: "b0", name: "Yankee" },
        { id: "a", findex: "b0", name: "Alpha" }, // Same findex as 'y', 'a' < 'y'
      ];
      const list = FractionallyIndexedList.from(items);
      expect(list.size).toBe(4);
      expect(toArray(list).map((i) => i.id)).toEqual(["x", "a", "y", "z"]);
    });

    it("should handle duplicate ids in the input iterable, keeping the last one encountered", () => {
      const items: TestItem[] = [
        { id: "a", findex: "a0", name: "Apple V1" },
        { id: "b", findex: "b0", name: "Banana" },
        { id: "a", findex: "a1", name: "Apple V2" }, // Duplicate id 'a'
      ];
      const list = FractionallyIndexedList.from(items);
      expect(list.size).toBe(2);
      const itemA = toArray(list).find((i) => i.id === "a");
      expect(itemA?.findex).toBe("a1");
      expect(itemA?.name).toBe("Apple V2");
      expect(
        toArray(list)
          .map((i) => i.id)
          .sort(),
      ).toEqual(["a", "b"].sort());
    });

    it("should sort correctly items with different findex lengths", () => {
      const items: TestItem[] = [
        { id: "a", findex: "a", name: "A" },
        { id: "b", findex: "aa", name: "AA" },
        { id: "c", findex: "b", name: "B" },
      ];
      const list = FractionallyIndexedList.from(items);
      expect(toArray(list).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });
  });

  // --- delete ---
  describe("delete()", () => {
    it("should delete an existing item", () => {
      const list = FractionallyIndexedList.from([item1, item2, item3]);
      list.delete("b");
      expect(list.size).toBe(2);
      expect(toArray(list).map((i) => i.id)).toEqual(["a", "c"]);
    });

    it("should do nothing if item to delete does not exist", () => {
      const list = FractionallyIndexedList.from([item1, item2]);
      list.delete("z");
      expect(list.size).toBe(2);
      expect(toArray(list).map((i) => i.id)).toEqual(["a", "b"]);
    });

    it("should do nothing when deleting from an empty list", () => {
      const list = FractionallyIndexedList.from<TestItem>([]);
      list.delete("a");
      expect(list.size).toBe(0);
    });
  });

  // --- insert ---
  describe("insert()", () => {
    it("should insert into an empty list", () => {
      const list = new FractionallyIndexedList<TestItem>();
      list.insert(item1);
      expect(list.size).toBe(1);
      expect(toArray(list)[0]).toEqual(item1);
    });

    it("should insert at the beginning", () => {
      const list = FractionallyIndexedList.from([item2, item3]);
      list.insert(item1); // findex 'a0'
      expect(list.size).toBe(3);
      expect(toArray(list).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("should insert at the end", () => {
      const list = FractionallyIndexedList.from([item1, item2]);
      list.insert(item3); // findex 'c0'
      expect(list.size).toBe(3);
      expect(toArray(list).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("should insert in the middle", () => {
      const list = FractionallyIndexedList.from([item1, item3]);
      list.insert(item2); // findex 'b0'
      expect(list.size).toBe(3);
      expect(toArray(list).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("should insert item with same findex but smaller id before existing", () => {
      const list = FractionallyIndexedList.from([item2]); // id 'b', findex 'b0'
      const newItem: TestItem = {
        id: "a1",
        findex: "b0",
        name: "Another Banana",
      }; // id 'a1' < 'b'
      list.insert(newItem);
      expect(list.size).toBe(2);
      expect(toArray(list).map((i) => i.id)).toEqual(["a1", "b"]);
    });

    it("should insert item with same findex but larger id after existing", () => {
      const list = FractionallyIndexedList.from([item2]); // id 'b', findex 'b0'
      list.insert(item5); // id 'e', findex 'b0' -> 'e' > 'b'
      expect(list.size).toBe(2);
      expect(toArray(list).map((i) => i.id)).toEqual(["b", "e"]);
    });

    it("should insert correctly when findexes are lexicographically tricky", () => {
      const list = FractionallyIndexedList.from([
        { id: "1", findex: "a", name: "A" },
        { id: "3", findex: "ac", name: "AC" },
      ]);
      const newItem: TestItem = { id: "2", findex: "ab", name: "AB" };
      list.insert(newItem);
      expect(toArray(list).map((i) => i.id)).toEqual(["1", "2", "3"]);

      const newItem2: TestItem = { id: "0", findex: "0", name: "Zero" };
      list.insert(newItem2);
      expect(toArray(list).map((i) => i.id)).toEqual(["0", "1", "2", "3"]);

      const newItem3: TestItem = { id: "4", findex: "z", name: "Zed" };
      list.insert(newItem3);
      expect(toArray(list).map((i) => i.id)).toEqual(["0", "1", "2", "3", "4"]);
    });

    it("should not insert an item if an item with the same id and findex already exists", () => {
      const list = FractionallyIndexedList.from([item1, item2]);
      list.insert({ ...item1, name: "Updated Apple?" }); // Same id and findex
      expect(list.size).toBe(2);
      expect(toArray(list).map((i) => i.name)).toEqual(["Apple", "Banana"]); // Original item1 name
    });

    it("should correctly insert multiple items with the same findex but different ids", () => {
      const list = new FractionallyIndexedList<TestItem>();
      const item_b0_id_c: TestItem = { id: "c", findex: "b0", name: "C" };
      const item_b0_id_a: TestItem = { id: "a", findex: "b0", name: "A" };
      const item_b0_id_b: TestItem = { id: "b", findex: "b0", name: "B" };

      list.insert(item_b0_id_c);
      list.insert(item_b0_id_a);
      list.insert(item_b0_id_b);

      expect(toArray(list).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });
  });

  // --- [Symbol.iterator] ---
  describe("[Symbol.iterator]()", () => {
    it("should iterate over an empty list", () => {
      const list = new FractionallyIndexedList<TestItem>();
      const iteratedItems: TestItem[] = [];
      for (const item of list) {
        iteratedItems.push(item);
      }
      expect(iteratedItems.length).toBe(0);
    });

    it("should iterate over items in sorted order", () => {
      const items = [item3, item1, item2]; // Unsorted
      const list = FractionallyIndexedList.from(items);
      const iteratedIds: string[] = [];
      for (const item of list) {
        iteratedIds.push(item.id);
      }
      expect(iteratedIds).toEqual(["a", "b", "c"]); // Expected sorted order
    });
  });

  // --- size ---
  describe("size", () => {
    it("should return 0 for an empty list", () => {
      const list = new FractionallyIndexedList<TestItem>();
      expect(list.size).toBe(0);
    });

    it("should return the correct number of items", () => {
      const list = FractionallyIndexedList.from([item1, item2, item3]);
      expect(list.size).toBe(3);
      list.delete(item1.id);
      expect(list.size).toBe(2);
      list.insert(item4);
      expect(list.size).toBe(3);
    });
  });

  // --- Mixed Operations ---
  describe("Mixed Operations", () => {
    it("should maintain correct order after multiple insertions and deletions", () => {
      const list = new FractionallyIndexedList<TestItem>();
      const i1: TestItem = { id: "id1", findex: "a", name: "1" };
      const i2: TestItem = { id: "id2", findex: "c", name: "2" };
      const i3: TestItem = { id: "id3", findex: "b", name: "3" };
      const i4: TestItem = { id: "id4", findex: "aa", name: "4" };
      const i5: TestItem = { id: "id5", findex: "ab", name: "5" };

      list.insert(i1); // [1(a)]
      list.insert(i2); // [1(a), 2(c)]
      list.insert(i3); // [1(a), 3(b), 2(c)]
      expect(toArray(list).map((i) => i.findex)).toEqual(["a", "b", "c"]);

      list.delete("id3"); // [1(a), 2(c)]
      expect(toArray(list).map((i) => i.findex)).toEqual(["a", "c"]);

      list.insert(i4); // [1(a), 4(aa), 2(c)]
      list.insert(i5); // [1(a), 4(aa), 5(ab), 2(c)]
      expect(toArray(list).map((i) => i.findex)).toEqual(["a", "aa", "ab", "c"]);
      expect(toArray(list).map((i) => i.id)).toEqual(["id1", "id4", "id5", "id2"]);

      const i6: TestItem = { id: "id6", findex: "aa", name: "6" }; // Same findex as i4, id6 > id4
      list.insert(i6);
      expect(toArray(list).map((i) => i.id)).toEqual(["id1", "id4", "id6", "id5", "id2"]);
      expect(toArray(list).map((i) => i.findex)).toEqual(["a", "aa", "aa", "ab", "c"]);

      list.delete("id1");
      list.delete("id4");
      list.delete("id5");
      list.delete("id2");
      list.delete("id6");
      expect(list.size).toBe(0);
    });
  });
});
