import { OrderBy } from "generated/tauri-commands";
import { use, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useOutlineStore } from "src/Providers";

export function useSearchResults(query: string, orderBy: OrderBy) {
  const store = useOutlineStore();
  const [results, setResults] = useState<string[]>([]);
  const [loadedLength, setLoadedLength] = useState(0);
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    setResults([]);
    setLoadedLength(0);
  }, [query, orderBy]);

  const initialResultsPromise = useMemo(() => {
    if (loadedLength === 0 && query) {
      return store.loader.fetchSearchResults(query, orderBy, 0);
    }
    return null;
  }, [query, store.loader, orderBy, loadedLength]);

  const initialResults = initialResultsPromise ? use(initialResultsPromise) : null;

  useEffect(() => {
    if (initialResults) {
      setResults(store.findSortedRootIds(initialResults, orderBy));
      setLoadedLength(initialResults.length);
    }
  }, [store, initialResults, orderBy]);

  const loadMore = useCallback(async () => {
    const moreResults = await store.loader.fetchSearchResults(query, orderBy, loadedLength);
    if (moreResults.length > 0) {
      startTransition(() => {
        setResults((prev) => [...prev, ...store.findSortedRootIds(moreResults, orderBy)]);
        setLoadedLength((prev) => prev + moreResults.length);
      });
    }
  }, [store, query, orderBy, loadedLength]);

  return {
    results,
    loadMore,
    isLoading,
  };
}
