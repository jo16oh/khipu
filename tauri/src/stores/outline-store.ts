import { commands } from "generated/tauri-commands";
import { WritableDraft, produce } from "immer";
import { Outline, RawOutline } from "src/model";
import { uint8ArrayToBase64Async as uint8ArrayToBase64Async } from "src/utils";
import type { DeepReadonly } from "ts-essentials";
import * as Y from "yjs";
import { AssetStore } from "./asset-store";
import { DocUpdateNotifier } from "./doc-update-notifier";
import { OutlineChildrenStore } from "./outline-children-store";
import { OutlinePathStore } from "./outline-path-store";
import { OutlineStoreReducer } from "./outline-store-reducer";
import { SubscribersMap } from "./subscribers-map";
import { UndoManager } from "./undo-manager";

export type OutlineStoreUpdater = (
  id: string,
  update: (draft: WritableDraft<Outline>) => void,
) => void;

type Commands = Pick<typeof commands, "upsertOutline">;

export class OutlineStore {
  #outlines = new Map<string, Outline>();
  #children = new OutlineChildrenStore();
  #paths = new OutlinePathStore(this);
  #ydocs = new Map<string, Y.Doc>();
  #yUndoManagers = new Map<string, Y.UndoManager>();
  #pendingYUpdates = new Map<string, Uint8Array[]>();
  #outlineSubscribers = new SubscribersMap<[]>();
  #docUpdateNotifier: DocUpdateNotifier;
  #assets = new AssetStore();
  #commands: Commands;
  readonly #undoManager: UndoManager;

  readonly reducer: OutlineStoreReducer;

  constructor(docUpdateNotifier: DocUpdateNotifier, commands: Commands) {
    this.#docUpdateNotifier = docUpdateNotifier;
    this.#undoManager = new UndoManager(this, docUpdateNotifier);
    this.#commands = commands;
    this.reducer = new OutlineStoreReducer(this, this.#undoManager, this.#children, this.#update);
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

  register(...outlines: Outline[]) {
    for (const o of outlines) {
      const old = this.#outlines.get(o.id);
      if (!old || old.updatedAt < o.updatedAt) {
        this.#outlines.set(o.id, o);
        this.#children.set(o);
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
          this.#ydocs.delete(o.id);
          unsubscribe();
        });
      }
    }
  }

  readonly registerAsset = this.#assets.register;

  getOutline(id: string): DeepReadonly<Outline> | undefined {
    return this.#outlines.get(id);
  }

  getOutlineChildren(id: string) {
    return this.#children.get(id)?.map((c) => c.id) ?? [];
  }

  readonly getOutlinePath = this.#paths.getPath;

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

  readonly getYUndoManager = this.#yUndoManagers.get;

  readonly getAsset = this.#assets.load;

  subscribeToOutline(id: string, cb: () => void) {
    this.#outlineSubscribers.subscribe(id, cb);
    return () => {
      this.#outlineSubscribers.unsubscribe(id, cb);
    };
  }

  readonly subscribeToOutlineChildren = this.#children.subscribe;

  readonly subscribeToOutlinePath = this.#paths.subscribe;

  readonly subscribeToAsset = this.#assets.subscribe;

  async save(id: string) {
    const outline = this.#outlines.get(id);
    if (!outline) throw new Error("outline not found");

    const pendingYUpdates = this.#pendingYUpdates.get(id);
    if (!pendingYUpdates) return;

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
  }

  readonly has = this.#outlines.has;
}
