import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { OrderBy, TimelinePosition } from "generated/tauri-commands";
import { useState } from "react";
import { useOutlineStore } from "src/stores/outline-store";

const MAX_TL_LEN = 10;

export function useTimeline(position: TimelinePosition, order: OrderBy) {
  const store = useOutlineStore();

  const [initialPosition, setInitialPosition] = useState(position);

  const jump = (position: TimelinePosition) => {
    setInitialPosition(position);
  };

  const queryResult = useSuspenseInfiniteQuery({
    queryKey: ["fetchTimeline", order, initialPosition],
    queryFn: ({ pageParam }) => store.loader.fetchTimeline(pageParam, order),
    initialPageParam: initialPosition,
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

  return [queryResult, jump];
}
