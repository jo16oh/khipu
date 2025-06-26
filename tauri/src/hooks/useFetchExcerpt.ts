import { useSuspenseQuery } from "@tanstack/react-query";
import { useOutlineStore } from "src/stores/outline-store"

export function useFetchExcerpt(id: string) {
  const store = useOutlineStore();

  return useSuspenseQuery({
    queryKey: ["fetchExcerpt", id],
    queryFn: () => store.loader.fetchExcerpt(id),
  });
}
