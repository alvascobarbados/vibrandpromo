/**
 * Small self-contained inline editors used across the /team Pricelist.
 * Click to edit, Enter or click-away saves, Esc cancels. A spinner shows while
 * the write is in flight and the failure message stays next to the field so a
 * row never silently loses an edit.
 */
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Base = {
  label?: string;
  placeholder?: string;
  className?: string;
  align?: "left" | "right";
  readOnly?: boolean;
  /** Long values wrap to two lines (with a native tooltip) instead of truncating. */
  wrap?: boolean;
};

const box =
  "h-7 w-full min-w-0 rounded border border-navy-200 bg-card px-1.5 text-[13px] outline-none focus:border-lime-500";

function useSaver(save: (raw: string) => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (raw: string) => {
    setPending(true);
    setError(null);
    try {
      await save(raw);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save");
    } finally {
      setPending(false);
    }
  };
  return { pending, error, run, setError };
}

export function InlineField({
  value,
  display,
  save,
  numeric,
  validate,
  label,
  placeholder,
  className,
  align = "left",
  readOnly,
  autoEdit,
  wrap,
}: Base & {
  value: string;
  display?: React.ReactNode;
  numeric?: boolean;
  validate?: (raw: string) => string | null;
  save: (raw: string) => Promise<void>;
  autoEdit?: boolean;
}) {
  const [editing, setEditing] = useState(Boolean(autoEdit));
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const { pending, error, run, setError } = useSaver(save);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      done.current = false;
      requestAnimationFrame(() => ref.current?.select());
    }
  }, [editing, value]);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    if (draft === value) return;
    const problem = validate?.(draft) ?? null;
    if (problem) {
      setError(problem);
      return;
    }
    void run(draft);
  };

  const shown = display ?? (value || <span className="text-muted-foreground">—</span>);

  return (
    <span className={`flex min-w-0 flex-col ${className ?? ""}`}>
      {label ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <span className="flex min-w-0 items-center gap-1">
        {editing && !readOnly ? (
          <input
            ref={ref}
            autoFocus
            value={draft}
            placeholder={placeholder}
            inputMode={numeric ? "decimal" : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              } else if (event.key === "Escape") {
                event.preventDefault();
                done.current = true;
                setEditing(false);
              }
            }}
            className={box}
          />
        ) : (
          <span
            title={wrap && value ? value : undefined}
            className={`min-w-0 flex-1 text-[13px] ${
              wrap ? "line-clamp-2 whitespace-normal break-words" : "truncate"
            } ${
              align === "right" ? "text-right" : ""
            } ${readOnly ? "" : "cursor-text hover:bg-navy-50"}`}
            onClick={(event) => {
              if (readOnly) return;
              event.stopPropagation();
              setEditing(true);
            }}
          >
            {shown}
          </span>
        )}
        {pending ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </span>
      {error ? <span className="text-[10px] font-medium text-destructive">{error}</span> : null}
    </span>
  );
}

export function InlineChoice({
  value,
  options,
  save,
  label,
  className,
  display,
}: Base & {
  value: string;
  options: Array<{ value: string; label: string }>;
  display?: React.ReactNode;
  save: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const { pending, error, run } = useSaver(save);

  return (
    <span className={`flex min-w-0 flex-col ${className ?? ""}`}>
      {label ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      ) : null}
      <span className="flex min-w-0 items-center gap-1">
        {editing ? (
          <select
            autoFocus
            defaultValue={value}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const next = event.target.value;
              setEditing(false);
              if (next !== value) void run(next);
            }}
            onBlur={() => setEditing(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setEditing(false);
            }}
            className={box}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className="min-w-0 flex-1 cursor-pointer truncate text-[13px] hover:bg-navy-50"
            onClick={(event) => {
              event.stopPropagation();
              setEditing(true);
            }}
          >
            {display ?? options.find((option) => option.value === value)?.label ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        )}
        {pending ? (
          <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
        ) : null}
      </span>
      {error ? <span className="text-[10px] font-medium text-destructive">{error}</span> : null}
    </span>
  );
}
