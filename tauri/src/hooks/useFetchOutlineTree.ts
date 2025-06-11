import { use, useMemo } from "react";
import { useOutlineStore } from "src/Providers";

export function useFetchOutlineTree(id: string) {
  const store = useOutlineStore();

  const fetchPromise = useMemo(async () => {
    await store.loader.fetchTree(id);
  }, [id]);

  use(fetchPromise);
}
