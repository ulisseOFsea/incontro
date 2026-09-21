import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,box-shadow,transform,color] duration-150 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-45 min-h-11 px-4 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent-hover",
        secondary:
          "bg-surface text-ink shadow-[var(--shadow-border)] hover:bg-sky",
        danger:
          "bg-surface text-danger shadow-[var(--shadow-border)] hover:bg-danger-soft",
        ghost: "text-muted hover:bg-sky hover:text-ink",
      },
      size: {
        default: "min-h-11 px-4",
        sm: "min-h-10 px-3 text-sm",
        full: "min-h-11 w-full px-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant, size, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
