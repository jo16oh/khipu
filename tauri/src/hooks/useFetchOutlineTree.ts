import { use, useMemo } from "react";
import { useOutlineStore } from "src/Providers";

export function useFetchOutlineTree(id: string) {
  const store = useOutlineStore();
  const fetchPromise = useMemo(() => store.loader.fetchTree(id), [store.loader, id]);
  use(fetchPromise);
}
