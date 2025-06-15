import { use, useMemo } from "react";
import { useOutlineStore } from "src/Providers";

export function useFetchExcerpt(id: string) {
  const store = useOutlineStore();
  const fetchExcerptPromise = useMemo(() => store.loader.fetchExcerpt(id), [store.loader, id]);
  use(fetchExcerptPromise);
}
