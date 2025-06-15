import { use, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useOutlineStore } from "src/Providers";

export function useInboundLinks(id: string) {
  const store = useOutlineStore();
  const [results, setResults] = useState<string[]>([]);
  const [loadedLength, setLoadedLength] = useState(0);
  const [isLoading, startTransition] = useTransition();

  useEffect(() => {
    setResults([]);
    setLoadedLength(0);
  }, [id]);

  const initialResultsPromise = useMemo(() => {
    if (loadedLength === 0) {
      return store.loader.fetchInboundLinks(id, loadedLength);
    }
    return null;
  }, [id, store.loader, loadedLength]);

  const initialResults = initialResultsPromise ? use(initialResultsPromise) : null;

  useEffect(() => {
    if (initialResults) {
      setResults(store.findSortedRootIds(initialResults, "updatedAt"));
      setLoadedLength(initialResults.length);
    }
  }, [store, initialResults]);

  const loadMore = useCallback(async () => {
    const moreResults = await (() => {
      return store.loader.fetchInboundLinks(id, loadedLength);
    })();

    if (moreResults.length > 0) {
      startTransition(() => {
        setResults((prev) => [...prev, ...store.findSortedRootIds(moreResults, "updatedAt")]);
        setLoadedLength((prev) => prev + moreResults.length);
      });
    }
  }, [id, store, loadedLength]);

  return {
    results,
    loadMore,
    isLoading,
  };
}
