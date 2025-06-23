import { useSuspenseQuery } from "@tanstack/react-query";
import { useOutlineStore } from "src/Providers";

export function useFetchOutlineTree(id: string) {
  const store = useOutlineStore();

  return useSuspenseQuery({
    queryKey: ["fetchTree", id],
    queryFn: () => store.loader.fetchTree(id),
  });
}
