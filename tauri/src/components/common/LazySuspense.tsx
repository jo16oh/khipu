import { ComponentProps, Suspense, useEffect, useState } from "react";

export default function LazySuspense({ children, fallback }: ComponentProps<typeof Suspense>) {
  const [isInitial, setIsInitial] = useState(true);

  useEffect(() => setIsInitial(false), []);

  if (isInitial) {
    return <>{children}</>;
  } else {
    return <Suspense fallback={fallback}>{children}</Suspense>;
  }
}
