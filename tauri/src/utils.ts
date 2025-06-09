import bs58 from "bs58";
import { uuidv7obj } from "uuidv7";

export function uuidv7bs58() {
  return bs58.encode(uuidv7obj().bytes);
}

export function uint8ArrayToBase64Async(blobPart: BlobPart): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([blobPart], { type: "application/octet-stream" });
    const reader = new FileReader();

    reader.onload = () => {
      // remove url prefix "data:application/octet-stream;base64,..."
      const base64String = (reader.result as string).split(",")[1]!;
      resolve(base64String);
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsDataURL(blob);
  });
}
