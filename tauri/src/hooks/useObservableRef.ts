import { useMemo, useRef } from "react";

export function useObservableRef<T>(value: T) {
  const ref = useRef<T>(value);
  const subscribers = useRef<Set<(value: T) => void>>(new Set());

  const refObj = useMemo(
    () => ({
      get current() {
        return ref.current;
      },

      set current(value: T) {
        ref.current = value;

        for (const cb of subscribers.current) {
          cb(ref.current);
        }
      },

      listen(cb: (value: T) => void) {
        subscribers.current.add(cb);
        return () => subscribers.current.delete(cb);
      },
    }),
    [ref, subscribers],
  );

  return refObj;
}
