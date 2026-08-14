import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";

/** Inline text/number cell: saves on Enter or blur, reverts on Escape. */
export function InlineField({
  value,
  onSave,
  type = "text",
  placeholder,
  suffix,
  className,
  align = "left",
  ariaLabel,
}: {
  value: string;
  onSave: (next: string) => Promise<unknown> | void;
  type?: "text" | "number";
  placeholder?: string;
  suffix?: string;
  className?: string;
  align?: "left" | "right";
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saving) setDraft(value);
  }, [value, saving]);

  async function commit() {
    if (draft === value) {
      setError(null);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Save failed");
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div className="flex items-center gap-1">
        <Input
          aria-label={ariaLabel}
          type={type}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            }
            if (event.key === "Escape") {
              setDraft(value);
              setError(null);
              (event.target as HTMLInputElement).blur();
            }
          }}
          className={`h-8 text-xs ${align === "right" ? "text-right" : ""} ${
            error ? "border-destructive" : ""
          }`}
        />
        {suffix ? <span className="text-[11px] text-muted-foreground">{suffix}</span> : null}
        {saving ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : null}
      </div>
      {error ? <p className="mt-0.5 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function numberOrNull(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) throw new Error("Enter a valid number");
  return parsed;
}

export function nonNegative(raw: string): number {
  const parsed = numberOrNull(raw);
  if (parsed === null) throw new Error("Value required");
  if (parsed < 0) throw new Error("Must be 0 or more");
  return parsed;
}
