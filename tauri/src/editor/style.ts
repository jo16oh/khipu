import { cva } from "generated/styled-system/css";

export const editorStyleRecipe = cva({
  base: {
    cursor: "text",
    ring: "none",
    w: "full",
    minH: "[1lh]",
    "& .suggestion": {
      rounded: "md",
      p: "1",
      bg: "stone.200",
    },
    "& [data-is-empty='true']:first-child::before": {
      float: "start",
      h: "0",
      color: "stone.400",
      content: '"Untitled"',
      pointerEvents: "none",
    },
    "& *": {
      minH: "[1lh]",
      wordBreak: "break-word",
      textWrap: "wrap",
      userSelect: "text",
      whiteSpace: "pre-wrap",
    },
    "& h1": {
      fontSize: "[1.75rem]",
      fontWeight: "bold",
    },
    "& h2": {
      fontSize: "[1.6rem]",
      fontWeight: "bold",
    },
    "& h3": {
      fontSize: "[1.45rem]",
      fontWeight: "bold",
    },
    "& h4": {
      fontSize: "[1.3rem]",
      fontWeight: "bold",
    },
    "& h5": {
      fontSize: "[1.15rem]",
      fontWeight: "bold",
    },
    "& h6": {
      fontSize: "[1rem]",
      fontWeight: "bold",
    },
  },
});
