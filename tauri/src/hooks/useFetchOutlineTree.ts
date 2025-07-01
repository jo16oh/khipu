import { useSuspenseQuery } from "@tanstack/react-query";
import { useOutlineStore } from "src/stores/outline-store";

export function useFetchOutlineTree(id: string) {
  const store = useOutlineStore();

  return useSuspenseQuery({
    queryKey: ["fetchTree", id],
    queryFn: () => store.loader.fetchTree(id),
  });
}
