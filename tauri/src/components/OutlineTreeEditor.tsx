import { styled } from "generated/styled-system/jsx";
import { useFetchOutlineTree } from "src/hooks/useFetchOutlineTree";
import { useOutlineChildren } from "src/hooks/useOutlineChildren";
import BulletButton from "./common/BulletButton";
import Editor from "./Editor";

export default function OutlineTreeEditor({ id }: { id: string }) {
  const { isLoading } = useFetchOutlineTree(id);
  const children = useOutlineChildren(id);

  return (
    <>
      <div>Editor</div>
      {isLoading ? <div>Loading...</div> : <Editor id={id} />}
      {children.map((id) => (
        <Container key={id}>
          <BulletButton isCollapsed={false} />
          <Editor id={id} />
        </Container>
      ))}
    </>
  );
}

const Container = styled("div", {
  base: {
    display: "flex",
    w: "full",
  },
});
