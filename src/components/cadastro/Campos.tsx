import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Campo({
  label,
  children,
  ia,
  className,
}: {
  label: string;
  children: ReactNode;
  ia?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="field-label flex items-center gap-1">
        {label}
        {ia ? <Sparkles className="size-3 text-brand" aria-hidden /> : null}
      </span>
      {children}
    </div>
  );
}

const base =
  "w-full rounded-md border bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

export function TextoInput({
  ia,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { ia?: boolean }) {
  return (
    <input
      {...props}
      className={cn(base, "h-10", ia ? "border-brand/60 bg-brand/5" : "border-border", className)}
    />
  );
}

export function SelectInput({
  ia,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { ia?: boolean }) {
  return (
    <select
      {...props}
      className={cn(base, "h-10", ia ? "border-brand/60 bg-brand/5" : "border-border", className)}
    >
      {children}
    </select>
  );
}

export function AreaTexto({
  ia,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ia?: boolean }) {
  return (
    <textarea
      {...props}
      className={cn(
        base,
        "min-h-28 resize-y py-2",
        ia ? "border-brand/60 bg-brand/5" : "border-border",
        className,
      )}
    />
  );
}

export function RadioSimNao({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  name: string;
}) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-6 text-sm text-foreground">
        {["Sim", "Não"].map((opcao) => (
          <label key={opcao} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name={name}
              checked={value === opcao}
              onChange={() => onChange(opcao)}
              className="size-4 accent-[var(--primary)]"
            />
            {opcao}
          </label>
        ))}
      </div>
    </div>
  );
}

export function SecaoTitulo({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-5 border-b border-border pb-2 text-base text-muted-foreground">{children}</h2>
  );
}
