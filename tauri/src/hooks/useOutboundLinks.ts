import { use, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useOutlineStore } from "src/Providers";

export function useOutboundLinks(id: string) {
  const store = useOutlineStore();

  const [isLoading, startTransition] = useTransition();

  const initialData = use(
    useMemo(() => {
      return store.loader.fetchOutboundLinks(id);
    }, [id, store.loader]),
  );

  const [results, setResults] = useState<string[]>(initialData);

  useEffect(() => {
    setResults(initialData);
  }, [initialData]);

  const reload = useCallback(async () => {
    const freshResults = await store.loader.fetchOutboundLinks(id);
    startTransition(() => {
      setResults(freshResults);
    });
  }, [id, store.loader, startTransition]);

  useEffect(() => store.onSaveInPath(id, reload), [id, reload, store]);

  return {
    results,
    reload,
    isLoading,
  };
}
