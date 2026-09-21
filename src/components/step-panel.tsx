import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StepPanel({
  children,
  className,
  title,
  hint,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  hint?: string;
}) {
  return (
    <section className={cn("panel step-enter sm:p-8", className)}>
      {title ? (
        <header className="mb-6">
          <h2 className="font-display text-2xl">{title}</h2>
          {hint ? <p className="text-muted mt-1">{hint}</p> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
