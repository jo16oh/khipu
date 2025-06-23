import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { OrderBy } from "generated/tauri-commands";
import { useOutlineStore } from "src/Providers";

export function useSearchResults(query: string, orderBy: OrderBy) {
  const store = useOutlineStore();

  return useSuspenseInfiniteQuery({
    queryKey: ["search", query, orderBy],
    queryFn: ({ pageParam }) => store.loader.fetchSearchResults(query, orderBy, pageParam),
    initialPageParam: 0,
    getNextPageParam: (_, allPages) => allPages.length,
  });
}
