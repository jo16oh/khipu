import { useSuspenseQuery } from "@tanstack/react-query";
import { useOutlineStore } from "src/Providers";

export function useOutboundLinks(id: string) {
  const store = useOutlineStore();

  return useSuspenseQuery({
    queryKey: ["fetchOutboundLinks", id],
    queryFn: () => store.loader.fetchOutboundLinks(id),
  });
}
