import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full min-w-0 max-w-full rounded-md border border-line bg-surface px-3 text-base text-ink",
          "placeholder:text-muted/70 transition-[border-color,box-shadow] duration-150",
          "focus-visible:outline-none focus-visible:border-accent",
          "disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
