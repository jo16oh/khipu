import { SVGProps } from "react";

export default function Triangle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M15 10l-9 5V5l9 5z" />
    </svg>
  );
}
