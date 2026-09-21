import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-md border border-line bg-surface px-3 py-3 text-base text-ink leading-relaxed",
        "placeholder:text-muted/70 transition-[border-color] duration-150",
        "focus-visible:outline-none focus-visible:border-accent resize-y",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
