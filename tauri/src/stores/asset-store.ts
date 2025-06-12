import bs58 from "bs58";
import { SubscribersMap } from "./subscribers-map";

type ObjectURL = string;

export class AssetStore {
  #map = new Map<string, [ObjectURL, Blob]>();
  #newAssetsHashes = new Set<string>();
  #subscribers = new SubscribersMap<string, []>();

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
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    this.#set(hash, url, blob);
    this.#newAssetsHashes.add(hash);
  }

  async load(hash: string): Promise<ObjectURL> {
    const url = this.#map.get(hash)?.[0];
    if (url) {
      return url;
    } else {
      const request = new Request("bin://assets/" + hash);
      const response = await fetch(request);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      this.#set(hash, url, blob);
      return url;
    }
  }

  subscribe(hash: string, cb: () => void) {
    this.#subscribers.subscribe(hash, cb);
    return () => {
      this.#subscribers.unsubscribe(hash, cb);
    };
  }

  getNewAssetHashes(hashes: string[]) {
    return hashes.filter(this.#newAssetsHashes.has);
  }

  getBlob(hash: string) {
    return this.#map.get(hash)?.[1];
  }

  markAssetsAsSaved(hashes: string[]) {
    for (const hash of hashes) {
      this.#newAssetsHashes.delete(hash);
    }
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
