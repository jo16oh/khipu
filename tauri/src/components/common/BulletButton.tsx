import { Button, ButtonProps } from "react-aria-components";
import Bullet from "./Bullet";

const BulletButton = ({
  isCollapsed,
  isDisabled,
  ...rest
}: { isCollapsed: boolean | undefined } & ButtonProps) => (
  <Button isDisabled={isDisabled ? true : false} {...rest}>
    <Bullet isCollapsed={isCollapsed} isDisabled={isDisabled} />
  </Button>
);

export default BulletButton;
