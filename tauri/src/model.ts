import type { JSONContent } from "@tiptap/react";
import { Outline as GeneratedOutlineType, OutlineType } from "generated/tauri-commands";
import type { DeepReadonly } from "ts-essentials";

export type RawOutline = GeneratedOutlineType;

export const RawOutline = {
  from(outline: Outline) {
    return {
      ...outline,
      doc: JSON.stringify(outline.doc),
      createdAt: outline.createdAt.getTime(),
      updatedAt: outline.updatedAt.getTime(),
    };
  },
} as const;

export type Outline = DeepReadonly<{
  id: string;
  parentId: string | null;
  findex: string;
  type: OutlineType;
  doc: JSONContent;
  createdAt: Date;
  updatedAt: Date;
  completed: boolean;
  collapsed: boolean;
  deleted: boolean;
}>;

export const Outline = {
  from(data: RawOutline): Outline {
    return {
      ...data,
      doc: JSON.parse(data.doc),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  },
} as const;
