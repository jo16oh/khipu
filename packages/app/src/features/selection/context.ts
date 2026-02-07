import { createContext } from "react";
import type { SelectionManager } from "./selection-manager";

/**
 * @package
 */
export const SelectionContext = createContext<SelectionManager | null>(null);
