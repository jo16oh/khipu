import { EditorContent, FocusPosition, JSONContent, Editor as Tiptap } from "@tiptap/react";
import { renderToReactElement } from "@tiptap/static-renderer";
import { css } from "generated/styled-system/css";
import { styled } from "generated/styled-system/jsx";
import { OutlineType } from "generated/tauri-commands";
import {
  memo,
  Ref,
  Suspense,
  use,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createEditorExtensions, createRendererExtensions } from "src/editor/schema";
import { useObservableRef } from "src/hooks/useObservableRef";
import { useOutline } from "src/hooks/useOutline";
import { useDocUpdateNotifier } from "src/stores/doc-update-notifier";
import { FocusManager, useFocusManager } from "src/stores/focus-manager";
import { useOutlineStore } from "src/stores/outline-store";

export type EditorHandle = {
  focus: (pos: FocusPosition) => void;
};

export default function Editor({ ref, id }: { ref?: Ref<EditorHandle>; id: string }) {
  const type = useOutline(id, ({ type }) => type);
  const focusManager = useFocusManager();
  const [focused, setFocused] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onMouseEnter = useCallback(() => startTransition(() => setFocused(true)), []);

  const editorRef = useObservableRef<EditorHandle | null>(null);

  const focus = useCallback(
    (pos: FocusPosition) => {
      startTransition(() => setFocused(true));
      const unsubscribe = editorRef.listen((handle) => {
        setTimeout(() => {
          if (handle) {
            handle?.focus(pos);
            unsubscribe();
          }
        });
      });
    },
    [editorRef],
  );

  useImperativeHandle(ref, () => ({ focus }), [focus]);

  useEffect(() => {
    const unmanage = focusManager.manage(id, focus);
    return unmanage;
  }, [focusManager, id, focus]);

  return (
    <Suspense>
      {focused && !isPending ? (
        <ActiveEditor
          ref={editorRef}
          id={id}
          type={type}
          setFocused={setFocused}
          focusManager={focusManager}
        />
      ) : (
        <MockEditor onMouseEnter={onMouseEnter} id={id} />
      )}
    </Suspense>
  );
}

function MockEditor({ id, onMouseEnter }: { id: string; onMouseEnter: () => void }) {
  const { type, doc } = useOutline(id, ({ type, doc }) => ({ type, doc }));
  const extensions = useMemo(() => createRendererExtensions(type), [type]);

  return (
    <EditorContainer type="mock" onMouseEnter={onMouseEnter}>
      {renderToReactElement({ extensions, content: doc as JSONContent })}
    </EditorContainer>
  );
}

const ActiveEditor = memo(function ActiveEditor({
  ref,
  id,
  type,
  setFocused,
  focusManager,
}: {
  ref?: Ref<EditorHandle>;
  id: string;
  type: OutlineType;
  setFocused: (value: boolean) => void;
  focusManager: FocusManager;
}) {
  const store = useOutlineStore();
  const ydoc = use(store.getYDoc(id));
  const notifier = useDocUpdateNotifier();

  const editor = useRef(
    new Tiptap({
      extensions: createEditorExtensions(id, ydoc, type, notifier, focusManager),
      editorProps: {
        attributes: {
          class: editorStyle,
        },
      },
      onBlur: () => setFocused(false),
    }),
  );

  useEffect(() => {
    return () => {
      store.save(id);
    };
  }, [store, id]);

  const onMouseLeave = useCallback(() => {
    if (editor.current && !editor.current.isFocused) {
      setFocused(false);
    }
  }, [editor, setFocused]);

  useImperativeHandle(
    ref,
    () => ({
      focus: (pos) => editor.current.commands.focus(pos),
    }),
    [editor],
  );

  return (
    <>
      <EditorContainer type="active" onMouseLeave={onMouseLeave}>
        <EditorContent editor={editor.current} />
      </EditorContainer>
    </>
  );
});

const rawEditorStyle = css.raw({
  cursor: "text",
  ring: "none",
  wordBreak: "break-word",
  userSelect: "text",
  whiteSpace: "pre-wrap",
});

const editorStyle = css(rawEditorStyle);

const EditorContainer = styled("div", {
  variants: {
    type: {
      active: {},
      mock: {
        ...rawEditorStyle,
      },
    },
  },
  base: {
    w: "full",
    minH: "6",
  },
});
