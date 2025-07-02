import { useQuery } from "@tanstack/react-query";
import { useOutlineStore } from "src/stores/outline-store";

export function useFetchOutlineTree(id: string) {
  const store = useOutlineStore();

  return useQuery({
    queryKey: ["fetchTree", id],
    queryFn: () => store.loader.fetchTree(id),
  });
}
