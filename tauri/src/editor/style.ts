import { GlobalStyleObject } from "@pandacss/dev";
import { SystemStyleObject } from "generated/styled-system/types";

export const editorStyle: SystemStyleObject = {
  "& .suggestion": {
    rounded: "md",
    p: "1",
    bg: "stone.200",
  },

  "& .tiptap": {
    ring: "none",
    cursor: "text",
  },
  "& .tiptap *": {
    wordBreak: "break-word",
    textWrap: "wrap",
    userSelect: "text",
    whiteSpace: "pre-wrap",
  },
  "& .heading[data-heading-level='1']": {
    minH: "[1lh]",
    fontSize: "h1",
    fontWeight: "bold",
  },
  "& .heading[data-heading-level='2']": {
    minH: "[1lh]",
    fontSize: "h2",
    fontWeight: "bold",
  },
  "& .heading[data-heading-level='3']": {
    minH: "[1lh]",
    fontSize: "h3",
    fontWeight: "bold",
  },
  "& .heading[data-heading-level='4']": {
    minH: "[1lh]",
    fontSize: "h4",
    fontWeight: "bold",
  },
  "& .heading[data-heading-level='5']": {
    minH: "[1lh]",
    fontSize: "h5",
    fontWeight: "bold",
  },
  "& .heading[data-heading-level='6']": {
    minH: "[1lh]",
    fontSize: "h6",
    fontWeight: "bold",
  },
  "& .heading [data-is-empty='true']:first-child::before": {
    float: "start",
    h: "0",
    color: "stone.400",
    content: '"Untitled"',
    pointerEvents: "none",
  },
  "& .internal-link": {
    color: "blue.500",
    "&[data-is-empty='true']": {
      opacity: "50",
    },
  },
};

export const defaultProseMirrorStyle: GlobalStyleObject = {
  ".ProseMirror": {
    WebkitFontVariantLigatures: "none",
    position: "relative",
    fontFeatureSettings: '"liga" 0',
    wordWrap: "break-word",
    whiteSpace: "break-spaces",
    fontVariantLigatures: "none",
  },
  ".ProseMirror pre": {
    whiteSpace: "pre-wrap",
  },
  ".ProseMirror li": {
    position: "relative",
  },
  ".ProseMirror-hideselection *::selection": {
    background: "transparent",
  },
  ".ProseMirror-hideselection *::-moz-selection": {
    background: "transparent",
  },
  ".ProseMirror-hideselection": {
    caretColor: "transparent",
  },
  ".ProseMirror [draggable][contenteditable=false]": {
    userSelect: "text",
  },
  "li.ProseMirror-selectednode:after": {
    position: "absolute",
    top: "-2px",
    left: "-32px",
    right: "-2px",
    bottom: "-2px",
    border: "2px solid #8cf",
    content: '""',
    pointerEvents: "none",
  },
  "img.ProseMirror-separator": {
    display: "inline !important",
    border: "none !important",
    margin: "0 !important",
  },
};
