import { extractTextFromDoc } from "src/editor/utils";
import { Outline, RawOutline } from "src/model";
import { OutlineStore } from "src/stores/outline-store";

type OutlineTreeNodeJson = {
  data: RawOutline;
  children: OutlineTreeNodeJson[];
};

class OutlineTreeNode {
  data: Outline;
  children: OutlineTreeNode[];

  constructor(data: Outline, children: OutlineTreeNode[] = []) {
    this.data = data;
    this.children = children;
  }

  static fromJSON(json: string) {
    const node = JSON.parse(json) as OutlineTreeNodeJson;
    return this.fromJSONImpl(node);
  }

  static fromJSONImpl(node: OutlineTreeNodeJson): OutlineTreeNode {
    return new OutlineTreeNode(
      Outline.from(node.data),
      node.children.map(OutlineTreeNode.fromJSONImpl),
    );
  }

  toJSON(): OutlineTreeNodeJson {
    return {
      data: {
        ...this.data,
        doc: JSON.stringify(this.data.doc),
        createdAt: this.data.createdAt.getTime(),
        updatedAt: this.data.updatedAt.getTime(),
      },
      children: this.children.map((c) => c.toJSON()),
    };
  }
}

export type InsertionPoint = {
  parentId: string | null;
  position: "start" | { after: Outline };
};

export async function insertOutlineNode(
  nodes: OutlineTreeNode[],
  point: InsertionPoint,
  store: OutlineStore,
) {
  insertOutlineNodeInner(nodes, point, store);
  const ids = nodes.flatMap(extractIdsFromNode);
  store.save(...ids);
}

function insertOutlineNodeInner(
  nodes: OutlineTreeNode[],
  point: InsertionPoint,
  store: OutlineStore,
) {
  let currentPosition = point.position;
  for (const node of nodes) {
    const newId = store.reducer.create({
      ...node.data,
      parentId: point.parentId,
      position: currentPosition,
    });
    const newOutline = store.getOutline(newId)!;
    currentPosition = { after: newOutline };
    insertOutlineNodeInner(node.children, { parentId: newId, position: "start" }, store);
  }
}

function extractIdsFromNode(node: OutlineTreeNode): string[] {
  return [node.data.id, ...node.children.flatMap(extractIdsFromNode)];
}

export async function copyOutlinesIntoClipboard(ids: string[], store: OutlineStore) {
  const sortedIds = Array.from(new Set(ids)).toSorted((idA, idB) => {
    const pathA = [...(store.getOutlinePath(idA) ?? []), idA];
    const pathB = [...(store.getOutlinePath(idB) ?? []), idB];

    const fullFindexA = pathA.reduce((prev, id) => prev + (store.getOutline(id)?.findex ?? ""), "");
    const fullFindexB = pathB.reduce((prev, id) => prev + (store.getOutline(id)?.findex ?? ""), "");

    return fullFindexA.localeCompare(fullFindexB);
  });

  // await Promise.all(sortedIds.map((id) => store.loader.fetchTree(id)));

  const outlineTree = sortedIds.map((id) => buildTree(id, store)).filter((item) => item !== null);

  const json = JSON.stringify(outlineTree);
  const text = generateIndentedText(outlineTree);

  const htmlString = `<div data-source="khipu" data-json='${json}'><pre>${text}</pre></div>`;
  const textBlob = new Blob([text], { type: "text/plain" });
  const htmlBlob = new Blob([htmlString], { type: "text/html" });

  const clipboardItem = new ClipboardItem({
    "text/plain": textBlob,
    "text/html": htmlBlob,
  });

  navigator.clipboard.write([clipboardItem]).catch((error) => console.error(error));
}

function buildTree(id: string, store: OutlineStore): OutlineTreeNode | null {
  const outline = store.getOutline(id);
  if (!outline) return null;
  return new OutlineTreeNode(
    outline,
    Array.from(store.getOutlineChildren(id) ?? [])
      .map(({ id: childId }) => buildTree(childId, store))
      .filter((child) => child !== null),
  );
}

function generateIndentedText(items: OutlineTreeNode[], level = 0): string {
  const indent = "\t".repeat(level);
  return items
    .map((item) => {
      const currentLine = item.data.doc ? indent + extractTextFromDoc(item.data.doc) : "";
      const childrenText =
        item.children.length > 0 ? "\n" + generateIndentedText(item.children, level + 1) : "";
      return currentLine + childrenText;
    })
    .join("\n");
}

export async function getOutlinesFromClipboard(): Promise<OutlineTreeNode[] | null> {
  const clipboardItems = await navigator.clipboard.read();
  const blob = await clipboardItems
    .find((item) => item.types.includes("text/html"))
    ?.getType("text/html");
  const html = await blob?.text();

  if (html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const sourceElement = doc.querySelector('[data-source="khipu"]') as HTMLElement;
    const data = JSON.parse(sourceElement.dataset["json"] ?? "");
    return data.map(OutlineTreeNode.fromJSONImpl);
  } else {
    return null;
  }
}
