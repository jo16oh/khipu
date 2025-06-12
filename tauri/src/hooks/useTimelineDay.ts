import { startOfDay } from "date-fns";
import { useSyncExternalStore } from "react";
import { useOutlineStore } from "src/Providers";
import { Order } from "src/stores/timeline-index";

export function useTimelineDay(timestamp: Date | number, order: Order) {
  const store = useOutlineStore();

  const dayStart = startOfDay(timestamp).getTime();

  return useSyncExternalStore(
    (cb) => store.subscribeToTimeline(dayStart, order, cb),
    () => store.getTimeline(dayStart, order),
  );
}
