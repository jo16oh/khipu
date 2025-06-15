import { OrderBy, TimelinePosition } from "generated/tauri-commands";
import { use, useCallback, useMemo, useState } from "react";
import { useOutlineStore } from "src/Providers";

const MAX_TL_LEN = 10;

export function useTimeline(position: TimelinePosition, order: OrderBy) {
  const store = useOutlineStore();

  const fetchTimeline = useMemo(async () => {
    return await store.loader.fetchTimeline(position, order);
  }, [store.loader, position, order]);

  const dayStart = use(fetchTimeline);

  const [timeline, setTimeline] = useState<number[]>(dayStart ? [dayStart] : []);

  const loadTop = useCallback(async () => {
    const pos = timeline[0] ? { after: timeline[0] } : "latest";
    const dayStart = await store.loader.fetchTimeline(pos, order);

    if (dayStart) {
      setTimeline([
        dayStart,
        ...(timeline.length > MAX_TL_LEN ? timeline.slice(0, MAX_TL_LEN) : timeline),
      ]);
    }

    return dayStart;
  }, [order, store, timeline]);

  const loadBottom = useCallback(async () => {
    const firstDay = timeline.at(-1);
    const pos = firstDay ? { before: firstDay } : "latest";
    const dayStart = await store.loader.fetchTimeline(pos, order);

    if (dayStart) {
      setTimeline([
        dayStart,
        ...(timeline.length > MAX_TL_LEN
          ? timeline.slice(timeline.length - MAX_TL_LEN, timeline.length)
          : timeline),
      ]);
    }

    return dayStart;
  }, [order, store.loader, timeline]);

  return { timeline, loadTop, loadBottom };
}
