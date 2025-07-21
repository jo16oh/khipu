import { EditorContent, FocusPosition, Editor as Tiptap } from "@tiptap/react";
import { styled } from "generated/styled-system/jsx";
import { OutlineAttrs } from "generated/tauri-commands";
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
  const attrs = useOutline(id, ({ attrs }) => attrs);
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
          attrs={attrs}
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
  const { attrs, doc } = useOutline(id, ({ attrs, doc }) => ({ attrs, doc }));

  return (
    <EditorContainer className="tiptap ProseMirror" onMouseEnter={onMouseEnter}>
      <StaticRenderer id={id} doc={doc} type={attrs.type} />
    </EditorContainer>
  );
});

const ActiveEditor = memo(function ActiveEditor({
  ref,
  id,
  attrs,
  setFocused,
  focusManager,
}: {
  ref?: Ref<EditorHandle>;
  id: string;
  attrs: OutlineAttrs;
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
        attrs,
        store,
        notifier,
        focusManager,
        viewStateStore,
      ),
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
    <EditorContainer onMouseLeave={onMouseLeave}>
      <EditorContent editor={editor.current} />
    </EditorContainer>
  );
});

const EditorContainer = styled("div", {
  base: {
    w: "full",
    minH: "[1lh]",
  },
});
