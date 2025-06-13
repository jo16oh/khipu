import { OrderBy, TimelinePosition } from "generated/tauri-commands";
import { use, useMemo, useState } from "react";
import { useOutlineStore } from "src/Providers";

const MAX_TL_LEN = 10;

export function useTimeline(position: TimelinePosition, order: OrderBy) {
  const store = useOutlineStore();

  const fetchTimeline = useMemo(async () => {
    return await store.loader.fetchTimeline(position, order);
  }, [order]);

  const dayStart = use(fetchTimeline);

  const [timeline, setTimeline] = useState<number[]>(dayStart ? [dayStart] : []);

  const loader = {
    async loadTop() {
      const pos = timeline[0] ? { after: timeline[0] } : "latest";
      const dayStart = await store.loader.fetchTimeline(pos, order);

      if (dayStart) {
        setTimeline([
          dayStart,
          ...(timeline.length > MAX_TL_LEN ? timeline.slice(0, MAX_TL_LEN) : timeline),
        ]);
      }

      return dayStart;
    },
    async loadBottom() {
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
    },
  } as const;

  return [timeline, loader];
}
