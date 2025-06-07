import bs58 from "bs58";
import { uuidv7obj } from "uuidv7";

export function uuidv7bs58() {
  return bs58.encode(uuidv7obj().bytes);
}
