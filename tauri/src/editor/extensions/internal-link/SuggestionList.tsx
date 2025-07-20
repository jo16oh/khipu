import { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer";
import { SuggestionProps } from "@tiptap/suggestion";
import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { Ref, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { createRendererExtensions } from "src/editor/schema";
import { useOutline } from "src/hooks/useOutline";
import { useOutlineStore } from "src/stores/outline-store";

export type SuggestionListHandler = {
  goDown: () => void;
  goUp: () => void;
  select: () => void;
};

export default function SuggestionList({
  ref,
  items,
  command,
}: {
  ref?: Ref<SuggestionListHandler>;
  items: string[];
} & SuggestionProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useImperativeHandle(ref, () => ({
    goUp() {
      setSelectedIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
    },
    goDown() {
      setSelectedIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
    },
    select() {
      command({ id: items[selectedIndex] });
    },
  }));

  return (
    <styled.div
      ringWidth="medium"
      rounded="md"
      w="56"
      p="1"
      ringColor="stone.500"
      bg="stone.50"
      shadow="md"
    >
      <List>
        {items.map((id, idx) => (
          <Candidate key={id} id={id} selected={idx === selectedIndex} />
        ))}
      </List>
    </styled.div>
  );
}

function Candidate({ id, selected }: { id: string; selected: boolean }) {
  const doc = useOutline(id, ({ doc }) => doc);
  const store = useOutlineStore();
  const extensions = useMemo(() => createRendererExtensions(id, "heading", store), [id, store]);

  return (
    <ListItem data-selected={selected}>
      <div className={editorStyle}>
        {renderToReactElement({ extensions, content: doc as JSONContent })}
      </div>
    </ListItem>
  );
}

const List = styled("div", {
  base: {
    display: "flex",
    gap: "1",
    flexDir: "column",
    p: "1",
  },
});

const ListItem = styled("div", {
  base: {
    p: "1",
    "&[data-selected=true]": {
      rounded: "md",
      bg: "stone.200",
    },
  },
});

const editorStyle = css({
  "& *": {
    wordBreak: "break-word",
    textWrap: "wrap",
    userSelect: "text",
    whiteSpace: "pre-wrap",
  },
});
