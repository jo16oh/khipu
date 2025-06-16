import { commands } from "generated/tauri-commands";
import { WritableDraft, produce } from "immer";
import { Outline, RawOutline } from "src/model";
import { uint8ArrayToBase64Async as uint8ArrayToBase64Async } from "src/utils";
import * as Y from "yjs";
import { AssetStore } from "./asset-store";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineChildrenStore } from "./outline-children-store";
import { OutlinePathStore } from "./outline-path-store";
import { OutlineStoreLoader } from "./outline-store-loader";
import { OutlineStoreReducer } from "./outline-store-reducer";
import { SubscribersMap } from "./subscribers-map";
import { Order, TimelineIndex } from "./timeline-index";
import { UndoManager } from "./undo-manager";

export type OutlineStoreUpdater = (
  id: string,
  update: (draft: WritableDraft<Outline>) => void,
) => void;

export type RegisterToStore = (...outlines: Outline[]) => void;

type Commands = Pick<
  typeof commands,
  "upsertOutline" | "tree" | "timeline" | "search" | "inboundLinks" | "outboundLinks" | "excerpt"
>;

export class OutlineStore {
  readonly #outlines = new Map<string, Outline>();
  readonly #children = new OutlineChildrenStore();
  readonly #paths = new OutlinePathStore(this);
  readonly #timeline = new TimelineIndex(this);
  readonly #ydocs = new Map<string, Y.Doc>();
  readonly #yUndoManagers = new Map<string, Y.UndoManager>();
  readonly #pendingYUpdates = new Map<string, Uint8Array[]>();
  readonly #outlineSubscribers = new SubscribersMap<string, []>();
  readonly #docUpdateNotifier: DocUpdateNotifier;
  readonly #assets = new AssetStore();
  readonly #commands: Commands;
  readonly #undoManager: UndoManager;
  readonly #onSaveInPathSubscribers = new SubscribersMap();

  readonly reducer: OutlineStoreReducer;
  readonly loader: OutlineStoreLoader;

  constructor(docUpdateNotifier: DocUpdateNotifier, commands: Commands) {
    this.#docUpdateNotifier = docUpdateNotifier;
    this.#undoManager = new UndoManager(this, docUpdateNotifier);
    this.#commands = commands;
    this.reducer = new OutlineStoreReducer(
      this,
      this.#register,
      this.#undoManager,
      this.#children,
      this.#update,
    );
    this.loader = new OutlineStoreLoader(this.#register, commands);
  }

  readonly #update: OutlineStoreUpdater = (id, update) => {
    const before = this.getOutline(id);
    if (!before) throw new Error("outline not found");

    const after = produce(before, (draft) => {
      update(draft);
      draft.id = before.id;
      draft.updatedAt = new Date();
    });

    if (before.parentId !== after.parentId) this.#paths.notify(id);

    this.#updateYDoc(before, after);
    this.#outlines.set(id, after);
    this.#children.set(after);
    this.#timeline.set(after);
    this.#outlineSubscribers.notify(id);
  };

  #updateYDoc(before: Outline, after: Outline) {
    const ydoc = this.getYDoc(before.id);
    const ymap = ydoc.getMap("props");

    ydoc.transact(() => {
      if (before.parentId !== after.parentId) ymap.set("parentId", after.parentId);
      if (before.findex !== after.findex) ymap.set("findex", after.findex);
      if (before.type !== after.type) ymap.set("type", after.type);
      if (before.completed !== after.completed) ymap.set("completed", after.completed);
      if (before.collapsed !== after.collapsed) ymap.set("collapsed", after.collapsed);
      if (before.deleted !== after.deleted) ymap.set("deleted", after.deleted);
    });
  }

  #register: RegisterToStore = (...outlines) => {
    for (const o of outlines) {
      const old = this.#outlines.get(o.id);
      if (!old || old.updatedAt < o.updatedAt) {
        this.#outlines.set(o.id, o);
        this.#children.set(o);
        this.#timeline.set(o);
      }

      // register cleanup callbacks
      if (!old) {
        const unsubscribe = this.#docUpdateNotifier.subscribe(o.id, (doc) => {
          const outline = this.#outlines.get(o.id);
          if (outline) this.#update(outline.id, (draft) => (draft.doc = doc));
        });

        this.#outlineSubscribers.onUnsubscribedAll(o.id, () => {
          this.#outlines.delete(o.id);
          this.#children.delete(o.id);
          this.#timeline.delete(o.id, o.createdAt);
          this.#ydocs.delete(o.id);
          unsubscribe();
        });
      }
    }
  };

  registerAsset(file: File) {
    return this.#assets.register(file);
  }

  getOutline(id: string): Outline | undefined {
    return this.#outlines.get(id);
  }

  getOutlineChildren(id: string) {
    return this.#children.get(id)?.map((c) => c.id) ?? [];
  }

  getOutlinePath(id: string) {
    return this.#paths.getPath(id);
  }

  getYDoc(id: string) {
    const ydoc = this.#ydocs.get(id);
    if (ydoc) {
      return ydoc;
    } else {
      const ydoc = new Y.Doc();
      this.#ydocs.set(id, ydoc);
      ydoc.on("updateV2", (update) => {
        const arr = this.#pendingYUpdates.get(id);
        if (arr) {
          arr.push(update);
        } else {
          this.#pendingYUpdates.set(id, [update]);
        }
      });

      const undoManager = new Y.UndoManager([ydoc.getMap("props"), ydoc.getXmlFragment("doc")]);
      this.#yUndoManagers.set(id, undoManager);
      undoManager.on("stack-item-added", (e) => {
        if (e.type === "undo") {
          this.#undoManager.addHistory(id);
        }
      });

      return ydoc;
    }
  }

  getYUndoManager(id: string) {
    return this.#yUndoManagers.get(id);
  }

  getTimeline(dayStart: number, order: Order) {
    return this.#timeline.get(dayStart, order);
  }

  getAsset(hash: string) {
    this.#assets.load(hash);
  }

  subscribeToOutline(id: string, cb: () => void) {
    this.#outlineSubscribers.subscribe(id, cb);
    return () => {
      this.#outlineSubscribers.unsubscribe(id, cb);
    };
  }

  subscribeToOutlineChildren(id: string, cb: () => void) {
    return this.#children.subscribe(id, cb);
  }

  subscribeToOutlinePath(id: string, cb: () => void) {
    return this.#paths.subscribe(id, cb);
  }

  subscribeToTimeline(dayStart: number, order: Order, cb: () => void) {
    return this.#timeline.subscribe(dayStart, order, cb);
  }

  subscribeToAsset(hash: string, cb: () => void) {
    return this.#assets.subscribe(hash, cb);
  }

  async save(id: string) {
    const outline = this.#outlines.get(id);
    if (!outline) throw new Error("outline not found");

    const pendingYUpdates = this.#pendingYUpdates.get(id);
    if (!pendingYUpdates || pendingYUpdates.length === 0) return;

    const encodedPendingYUpdates = await Promise.all(pendingYUpdates.map(uint8ArrayToBase64Async));

    const newAssetsData = await Promise.all(
      this.#assets.getNewAssetHashes([]).map(async (hash) => {
        const bytes = this.#assets.getBlob(hash);
        if (!bytes) throw new Error("asset is not found");
        const base64bytes = await uint8ArrayToBase64Async(await bytes.arrayBuffer());
        return [hash, base64bytes] as [string, string];
      }),
    ).then((arr) =>
      arr.reduce((acc: { [key in string]: string }, [hash, bytes]) => {
        acc[hash] = bytes;
        return acc;
      }, {}),
    );

    await this.#commands.upsertOutline(
      RawOutline.from(outline),
      encodedPendingYUpdates,
      [],
      [],
      newAssetsData,
    );

    pendingYUpdates.splice(0, encodedPendingYUpdates.length);

    this.#onSaveInPathSubscribers.notify(outline.id);
    let parent = outline.parentId ? this.#outlines.get(outline.parentId) : null;
    while (parent) {
      this.#onSaveInPathSubscribers.notify(parent.id);
      parent = parent.parentId ? this.#outlines.get(parent.parentId) : null;
    }
  }

  has(id: string) {
    return this.#outlines.has(id);
  }

  findSortedRootIds(outlineIds: string[], order: Order) {
    const buf = new Map<string, Date>();

    const outlinesToTimestamp: Map<string, [Outline, Date]> = new Map(
      outlineIds
        .map((id) => this.getOutline(id))
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
        const parent = this.getOutline(o.parentId);
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

  onSaveInPath(id: string, cb: () => void) {
    this.#onSaveInPathSubscribers.subscribe(id, cb);
    return () => {
      this.#onSaveInPathSubscribers.unsubscribe(id, cb);
    };
  }
}
