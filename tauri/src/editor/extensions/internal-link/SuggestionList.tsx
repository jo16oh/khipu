import { SuggestionProps } from "@tiptap/suggestion";
import { styled } from "generated/styled-system/jsx";
import { Ref, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { extractTextFromDoc } from "src/editor/utils";
import { useOutline } from "src/hooks/useOutline";

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
  const text = useMemo(() => extractTextFromDoc(doc), [doc]);

  return <ListItem data-selected={selected}>{text}</ListItem>;
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
