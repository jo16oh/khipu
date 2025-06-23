import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useOutlineStore } from "src/Providers";

export function useInboundLinks(id: string) {
  const store = useOutlineStore();

  return useSuspenseInfiniteQuery({
    queryKey: ["fetchInboundLinks", id],
    queryFn: ({ pageParam }) => store.loader.fetchInboundLinks(id, pageParam),
    initialPageParam: 0,
    getNextPageParam: (_, allPages) => allPages.length,
  });
}
