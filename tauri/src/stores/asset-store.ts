import bs58 from "bs58";
import { SubscribersMap } from "./subscribers-map";

type ObjectURL = string;
type LoadAssetCommand = (hash: string) => Promise<Blob>;
type SaveAssetCommand = (hash: string, blob: Blob) => Promise<void>;

export class AssetStore {
  #map = new Map<string, [ObjectURL, Blob]>();
  #newAssetsHashes = new Set<string>();
  #subscribers = new SubscribersMap<[]>();
  #load: LoadAssetCommand;
  #save: SaveAssetCommand;

  constructor(load: LoadAssetCommand, save: SaveAssetCommand) {
    this.#load = load;
    this.#save = save;
  }

  #set(hash: string, url: string, blob: Blob) {
    this.#map.set(hash, [url, blob]);
    this.#subscribers.onUnsubscribedAll(hash, () => {
      this.#map.delete(hash);
      URL.revokeObjectURL(url);
    });
  }

  async register(file: File) {
    const buf = await readFileAsArrayBuffer(file);
    const hash = await crypto.subtle
      .digest("SHA-256", buf)
      .then((buf) => bs58.encode(new Uint8Array(buf)));
    const blob = new Blob([buf]);
    const url = URL.createObjectURL(blob);
    this.#set(hash, url, blob);
    this.#newAssetsHashes.add(hash);
  }

  async load(hash: string) {
    if (this.#map.has(hash)) return;
    const blob = await this.#load(hash);
    const url = URL.createObjectURL(blob);
    this.#set(hash, url, blob);
  }

  async save(hashes: string[]) {
    const newAssetHashes = hashes.filter(this.#newAssetsHashes.has);

    await Promise.all(
      newAssetHashes.map((hash) => {
        const [_, blob] = this.#map.get(hash)!;
        return this.#save(hash, blob);
      }),
    );

    for (const hash of newAssetHashes) {
      this.#newAssetsHashes.delete(hash);
    }
  }

  getURL(hash: string) {
    return this.#map.get(hash)?.[0];
  }

  subscribe(hash: string, cb: () => void) {
    this.#subscribers.subscribe(hash, cb);
    return () => {
      this.#subscribers.unsubscribe(hash, cb);
    };
  }
}

function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (event.target?.result instanceof ArrayBuffer) {
        resolve(event.target.result);
      } else {
        reject(new Error("the result is not arraybuffer"));
      }
    };

    reader.onerror = (error: ProgressEvent<FileReader>) => {
      reject(error.target?.error || new Error("unknown error occured while reading the file"));
    };

    reader.readAsArrayBuffer(file);
  });
}
