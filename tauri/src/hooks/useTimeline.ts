import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { OrderBy, TimelinePosition } from "generated/tauri-commands";
import { useOutlineStore } from "src/Providers";

const MAX_TL_LEN = 10;

export function useTimeline(position: TimelinePosition, order: OrderBy) {
  const store = useOutlineStore();

  return useSuspenseInfiniteQuery({
    queryKey: ["fetchTimeline", order],
    queryFn: ({ pageParam }) => store.loader.fetchTimeline(pageParam, order),
    initialPageParam: position,
    getNextPageParam: (_, allPages) => {
      const prev = allPages.at(-1);
      return typeof prev === "number" ? { before: prev } : null;
    },
    getPreviousPageParam: (_, allPages) => {
      const prev = allPages[0];
      return typeof prev === "number" ? { after: prev } : null;
    },
    maxPages: MAX_TL_LEN,
  });
}
