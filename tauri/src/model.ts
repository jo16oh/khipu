import { OutlineType, Outline as RawOutline } from "generated/tauri-commands";

export type { Outline as RawOutline } from "generated/tauri-commands";

export type Outline = {
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
};

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

export type JSONContent = {
  text?: string;
  content?: JSONContent[];
};
