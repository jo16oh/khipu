import { Circle } from "generated/styled-system/jsx";

const Bullet = ({
  isCollapsed,
  isDisabled,
}: {
  isCollapsed?: boolean | undefined;
  isDisabled?: boolean | undefined;
}) => (
  <Circle
    data-collapsed={isCollapsed}
    data-enabled={!isDisabled ? true : undefined}
    size="[1.125rem]"
    css={{
      "&[data-enabled]": {
        _hover: {
          bg: "stone.300",
          cursor: "pointer",
        },
      },
      "&[data-collapsed=true]": {
        bg: "stone.200",
      },
    }}
  >
    <Circle size="[0.4375rem]" bg="stone.900" />
  </Circle>
);

export default Bullet;
