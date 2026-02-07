import { useContext, useMemo } from "react";
import { SelectionContext } from "./context";

/**
 * @package
 */
export function useSelectionManager() {
  const manager = useContext(SelectionContext);

  if (!manager) {
    throw new Error("Selection.Item must be used within a Selection.Area");
  }

  return manager;
}

/**
 * @public
 */
export function useSelection() {
  const manager = useSelectionManager();
  return useMemo(
    () => ({
      current: () => manager.currentSelection(),
    }),
    [manager],
  );
}
