import { EditorContent, FocusPosition, JSONContent, Editor as Tiptap } from "@tiptap/react";
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
  useRef,
  useState,
  useTransition,
} from "react";
import StaticRenderer from "src/editor/StaticRenderer";
import { createEditorExtensions } from "src/editor/schema";
import { editorStyleRecipe } from "src/editor/style";
import { useObservableRef } from "src/hooks/useObservableRef";
import { useOutline } from "src/hooks/useOutline";
import { useDocUpdateNotifier } from "src/stores/doc-update-notifier";
import { FocusManager, useFocusManager } from "src/stores/focus-manager";
import { useOutlineStore } from "src/stores/outline-store";
import { ViewStateStoreContext } from "src/stores/view-state-store";

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
    const currentFocus = focusManager.current();
    if (currentFocus && id === currentFocus.id) {
      focus(currentFocus.position);
    }
  }, [id, focusManager, focus]);

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

const MockEditor = memo(function MockEditor({
  id,
  onMouseEnter,
}: {
  id: string;
  onMouseEnter: () => void;
}) {
  const { type, doc } = useOutline(id, ({ type, doc }) => ({ type, doc }));

  return (
    <EditorContainer type="mock" onMouseEnter={onMouseEnter}>
      <StaticRenderer doc={doc as JSONContent} type={type} />
    </EditorContainer>
  );
});

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
  const viewStateStore = use(ViewStateStoreContext)!;

  const editor = useRef(
    new Tiptap({
      extensions: createEditorExtensions(
        id,
        ydoc,
        type,
        store,
        notifier,
        focusManager,
        viewStateStore,
      ),
      editorProps: {
        attributes: {
          class: editorStyle,
        },
      },
      onBlur: ({ editor }) => {
        setFocused(false);
        setTimeout(() => editor.destroy());
      },
    }),
  );

  useEffect(() => {
    return () => {
      store.save(id);
    };
  }, [store, id]);

  const onMouseLeave = () => {
    if (editor.current && !editor.current.isFocused) {
      setFocused(false);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      focus: (pos) => {
        if (typeof pos === "number" && pos < 0) {
          const size = editor.current.state.doc.nodeSize - 1;
          setTimeout(() => editor.current.commands.focus(size - Math.abs(pos)), 0);
        } else {
          setTimeout(() => editor.current.commands.focus(pos));
        }
      },
    }),
    [editor],
  );

  return (
    <EditorContainer type="active" onMouseLeave={onMouseLeave}>
      <EditorContent editor={editor.current} />
    </EditorContainer>
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
    ...editorStyleRecipe.raw(),
  },
});
