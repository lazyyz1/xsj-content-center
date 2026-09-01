import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-[calc(var(--radius)+4px)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]", className)}
      {...props}
    />
  );
}
