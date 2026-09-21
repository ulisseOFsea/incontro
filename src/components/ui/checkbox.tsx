import { cn } from "@/lib/utils";

type Props = {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

export function CheckRow({ id, checked, onChange, children, className }: Props) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 text-sm font-normal text-ink cursor-pointer select-none",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-accent"
      />
      <span>{children}</span>
    </label>
  );
}
