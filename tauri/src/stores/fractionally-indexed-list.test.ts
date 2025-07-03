import { describe, expect, it } from "vitest";
import { type FractionallyIndexedItem, FractionallyIndexedList } from "./fractionally-indexed-list";

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

  // --- toDeleted ---
  describe("toDeleted()", () => {
    it("should return a new list with deleted item", () => {
      const originalList = FractionallyIndexedList.from([item1, item2, item3]);
      const newList = originalList.toDeleted("b");
      expect(originalList.size).toBe(3); // Original unchanged
      expect(newList.size).toBe(2);
      expect(toArray(newList).map((i) => i.id)).toEqual(["a", "c"]);
    });

    it("should return the same list if item to delete does not exist", () => {
      const originalList = FractionallyIndexedList.from([item1, item2]);
      const newList = originalList.toDeleted("z");
      expect(originalList.size).toBe(2); // Original unchanged
      expect(newList.size).toBe(2);
      expect(toArray(newList).map((i) => i.id)).toEqual(["a", "b"]);
      expect(newList).toBe(originalList); // Should return the same instance
    });

    it("should return the same list when deleting from an empty list", () => {
      const originalList = FractionallyIndexedList.from<TestItem>([]);
      const newList = originalList.toDeleted("a");
      expect(originalList.size).toBe(0); // Original unchanged
      expect(newList.size).toBe(0);
      expect(newList).toBe(originalList); // Should return the same instance
    });
  });

  // --- toInserted ---
  describe("toInserted()", () => {
    it("should return a new list with inserted item into an empty list", () => {
      const originalList = FractionallyIndexedList.from<TestItem>([]);
      const newList = originalList.toInserted(item1);
      expect(originalList.size).toBe(0); // Original unchanged
      expect(newList.size).toBe(1);
      expect(toArray(newList)[0]).toEqual(item1);
    });

    it("should return a new list with item inserted at the beginning", () => {
      const originalList = FractionallyIndexedList.from([item2, item3]);
      const newList = originalList.toInserted(item1); // findex 'a0'
      expect(originalList.size).toBe(2); // Original unchanged
      expect(newList.size).toBe(3);
      expect(toArray(newList).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("should return a new list with item inserted at the end", () => {
      const originalList = FractionallyIndexedList.from([item1, item2]);
      const newList = originalList.toInserted(item3); // findex 'c0'
      expect(originalList.size).toBe(2); // Original unchanged
      expect(newList.size).toBe(3);
      expect(toArray(newList).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("should return a new list with item inserted in the middle", () => {
      const originalList = FractionallyIndexedList.from([item1, item3]);
      const newList = originalList.toInserted(item2); // findex 'b0'
      expect(originalList.size).toBe(2); // Original unchanged
      expect(newList.size).toBe(3);
      expect(toArray(newList).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });

    it("should return a new list with item with same findex but smaller id inserted before existing", () => {
      const originalList = FractionallyIndexedList.from([item2]); // id 'b', findex 'b0'
      const newItem: TestItem = {
        id: "a1",
        findex: "b0",
        name: "Another Banana",
      }; // id 'a1' < 'b'
      const newList = originalList.toInserted(newItem);
      expect(originalList.size).toBe(1); // Original unchanged
      expect(newList.size).toBe(2);
      expect(toArray(newList).map((i) => i.id)).toEqual(["a1", "b"]);
    });

    it("should return a new list with item with same findex but larger id inserted after existing", () => {
      const originalList = FractionallyIndexedList.from([item2]); // id 'b', findex 'b0'
      const newList = originalList.toInserted(item5); // id 'e', findex 'b0' -> 'e' > 'b'
      expect(originalList.size).toBe(1); // Original unchanged
      expect(newList.size).toBe(2);
      expect(toArray(newList).map((i) => i.id)).toEqual(["b", "e"]);
    });

    it("should return new lists with correct insertion when findexes are lexicographically tricky", () => {
      const originalList = FractionallyIndexedList.from([
        { id: "1", findex: "a", name: "A" },
        { id: "3", findex: "ac", name: "AC" },
      ]);
      const newItem: TestItem = { id: "2", findex: "ab", name: "AB" };
      const list1 = originalList.toInserted(newItem);
      expect(originalList.size).toBe(2); // Original unchanged
      expect(toArray(list1).map((i) => i.id)).toEqual(["1", "2", "3"]);

      const newItem2: TestItem = { id: "0", findex: "0", name: "Zero" };
      const list2 = list1.toInserted(newItem2);
      expect(toArray(list2).map((i) => i.id)).toEqual(["0", "1", "2", "3"]);

      const newItem3: TestItem = { id: "4", findex: "z", name: "Zed" };
      const list3 = list2.toInserted(newItem3);
      expect(toArray(list3).map((i) => i.id)).toEqual(["0", "1", "2", "3", "4"]);
    });

    it("should return the same list if an item with the same id and findex already exists", () => {
      const originalList = FractionallyIndexedList.from([item1, item2]);
      const newList = originalList.toInserted({ ...item1, name: "Updated Apple?" }); // Same id and findex
      expect(originalList.size).toBe(2); // Original unchanged
      expect(newList.size).toBe(2);
      expect(toArray(newList).map((i) => i.name)).toEqual(["Apple", "Banana"]); // Original item1 name
      expect(newList).toBe(originalList); // Should return the same instance
    });

    it("should return new lists with correct insertion of multiple items with the same findex but different ids", () => {
      const emptyList = FractionallyIndexedList.from<TestItem>([]);
      const item_b0_id_c: TestItem = { id: "c", findex: "b0", name: "C" };
      const item_b0_id_a: TestItem = { id: "a", findex: "b0", name: "A" };
      const item_b0_id_b: TestItem = { id: "b", findex: "b0", name: "B" };

      const list1 = emptyList.toInserted(item_b0_id_c);
      const list2 = list1.toInserted(item_b0_id_a);
      const list3 = list2.toInserted(item_b0_id_b);

      expect(toArray(list3).map((i) => i.id)).toEqual(["a", "b", "c"]);
    });
  });

  // --- [Symbol.iterator] ---
  describe("[Symbol.iterator]()", () => {
    it("should iterate over an empty list", () => {
      const list = FractionallyIndexedList.from<TestItem>([]);
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
      const list = FractionallyIndexedList.from<TestItem>([]);
      expect(list.size).toBe(0);
    });

    it("should return the correct number of items", () => {
      const originalList = FractionallyIndexedList.from([item1, item2, item3]);
      expect(originalList.size).toBe(3);
      const listAfterDelete = originalList.toDeleted(item1.id);
      expect(listAfterDelete.size).toBe(2);
      const listAfterInsert = listAfterDelete.toInserted(item4);
      expect(listAfterInsert.size).toBe(3);
    });
  });

  // --- Mixed Operations ---
  describe("Mixed Operations", () => {
    it("should maintain correct order after multiple insertions and deletions using non-destructive methods", () => {
      const emptyList = FractionallyIndexedList.from<TestItem>([]);
      const i1: TestItem = { id: "id1", findex: "a", name: "1" };
      const i2: TestItem = { id: "id2", findex: "c", name: "2" };
      const i3: TestItem = { id: "id3", findex: "b", name: "3" };
      const i4: TestItem = { id: "id4", findex: "aa", name: "4" };
      const i5: TestItem = { id: "id5", findex: "ab", name: "5" };

      const list1 = emptyList.toInserted(i1); // [1(a)]
      const list2 = list1.toInserted(i2); // [1(a), 2(c)]
      const list3 = list2.toInserted(i3); // [1(a), 3(b), 2(c)]
      expect(toArray(list3).map((i) => i.findex)).toEqual(["a", "b", "c"]);

      const list4 = list3.toDeleted("id3"); // [1(a), 2(c)]
      expect(toArray(list4).map((i) => i.findex)).toEqual(["a", "c"]);

      const list5 = list4.toInserted(i4); // [1(a), 4(aa), 2(c)]
      const list6 = list5.toInserted(i5); // [1(a), 4(aa), 5(ab), 2(c)]
      expect(toArray(list6).map((i) => i.findex)).toEqual(["a", "aa", "ab", "c"]);
      expect(toArray(list6).map((i) => i.id)).toEqual(["id1", "id4", "id5", "id2"]);

      const i6: TestItem = { id: "id6", findex: "aa", name: "6" }; // Same findex as i4, id6 > id4
      const list7 = list6.toInserted(i6);
      expect(toArray(list7).map((i) => i.id)).toEqual(["id1", "id4", "id6", "id5", "id2"]);
      expect(toArray(list7).map((i) => i.findex)).toEqual(["a", "aa", "aa", "ab", "c"]);

      const list8 = list7.toDeleted("id1");
      const list9 = list8.toDeleted("id4");
      const list10 = list9.toDeleted("id5");
      const list11 = list10.toDeleted("id2");
      const finalList = list11.toDeleted("id6");
      expect(finalList.size).toBe(0);
    });
  });
});
