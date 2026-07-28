import { HTMLAttributes } from "react";

export function Card({
  className = "",
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      {...props}
      className={
        "rounded-[18px] border border-line bg-surface shadow-xs " +
        (interactive
          ? "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md "
          : "") +
        className
      }
    />
  );
}

export function CardBody({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`p-6 ${className}`} />;
}
