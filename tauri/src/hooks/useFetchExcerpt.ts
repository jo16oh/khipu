import { useSuspenseQuery } from "@tanstack/react-query";
import { useOutlineStore } from "src/Providers";

export function useFetchExcerpt(id: string) {
  const store = useOutlineStore();

  return useSuspenseQuery({
    queryKey: ["fetchExcerpt", id],
    queryFn: () => store.loader.fetchExcerpt(id),
  });
}
