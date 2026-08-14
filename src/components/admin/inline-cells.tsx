/**
 * Inline cell editors for the Admin › Products table. Double-click a cell to
 * edit; Enter saves, Esc cancels, click-away saves, Tab saves and advances.
 * These only collect input — validation and the write both live in the shared
 * product update path (validateForm + persistProduct on the products route).
 */
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type CellCommit = (advance: boolean) => void;

type Shared = {
  editing: boolean;
  pending: boolean;
  error: string | null;
  onStart: () => void;
  onCancel: () => void;
};

const inputClass =
  "h-6 w-full min-w-0 rounded border border-navy-200 bg-card px-1 text-[13px] outline-none focus:border-lime-500";

function Wrap({
  children,
  pending,
  error,
}: {
  children: React.ReactNode;
  pending: boolean;
  error: string | null;
}) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <span className="min-w-0 flex-1">{children}</span>
      {pending ? <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" /> : null}
      {error ? (
        <span className="shrink-0 text-[10px] font-medium text-destructive" title={error}>
          !
        </span>
      ) : null}
    </span>
  );
}

/** Read-only display that opens the editor on double-click. */
export function CellView({
  children,
  pending,
  error,
  onStart,
}: {
  children: React.ReactNode;
  pending: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <span
      className="block min-w-0 cursor-text"
      onDoubleClick={(event) => {
        event.stopPropagation();
        onStart();
      }}
    >
      <Wrap pending={pending} error={error}>
        {children}
      </Wrap>
    </span>
  );
}

export function InlineText({
  value,
  display,
  onSave,
  mono,
  numeric,
  ...shared
}: Shared & {
  value: string;
  display: React.ReactNode;
  mono?: boolean;
  numeric?: boolean;
  onSave: (next: string, advance: boolean) => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (shared.editing) {
      setDraft(value);
      done.current = false;
      requestAnimationFrame(() => ref.current?.select());
    }
  }, [shared.editing, value]);

  if (!shared.editing)
    return (
      <CellView pending={shared.pending} error={shared.error} onStart={shared.onStart}>
        {display}
      </CellView>
    );

  const commit = (advance: boolean) => {
    if (done.current) return;
    done.current = true;
    onSave(draft, advance);
  };

  return (
    <input
      ref={ref}
      autoFocus
      value={draft}
      inputMode={numeric ? "numeric" : undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commit(false)}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(false);
        } else if (event.key === "Escape") {
          event.preventDefault();
          done.current = true;
          shared.onCancel();
        } else if (event.key === "Tab") {
          event.preventDefault();
          commit(true);
        }
      }}
      className={`${inputClass} ${mono ? "font-mono" : ""}`}
    />
  );
}

export function InlineSelect({
  value,
  display,
  options,
  onSave,
  ...shared
}: Shared & {
  value: string;
  display: React.ReactNode;
  options: Array<{ value: string; label: string }>;
  onSave: (next: string, advance: boolean) => void;
}) {
  const done = useRef(false);
  const ref = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (shared.editing) {
      done.current = false;
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [shared.editing]);

  if (!shared.editing)
    return (
      <CellView pending={shared.pending} error={shared.error} onStart={shared.onStart}>
        {display}
      </CellView>
    );

  const commit = (next: string, advance: boolean) => {
    if (done.current) return;
    done.current = true;
    onSave(next, advance);
  };

  return (
    <select
      ref={ref}
      defaultValue={value}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => commit(event.target.value, false)}
      onBlur={(event) => commit(event.target.value, false)}
      onKeyDown={(event) => {
        const target = event.currentTarget;
        if (event.key === "Enter") {
          event.preventDefault();
          commit(target.value, false);
        } else if (event.key === "Escape") {
          event.preventDefault();
          done.current = true;
          shared.onCancel();
        } else if (event.key === "Tab") {
          event.preventDefault();
          commit(target.value, true);
        }
      }}
      className={inputClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Production is two small fields: min / max days. Blank pair clears both. */
export function InlineProduction({
  min,
  max,
  display,
  onSave,
  ...shared
}: Shared & {
  min: string;
  max: string;
  display: React.ReactNode;
  onSave: (next: { min: string; max: string }, advance: boolean) => void;
}) {
  const [draft, setDraft] = useState({ min, max });
  const wrap = useRef<HTMLSpanElement>(null);
  const first = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (shared.editing) {
      setDraft({ min, max });
      done.current = false;
      requestAnimationFrame(() => first.current?.select());
    }
  }, [shared.editing, min, max]);

  if (!shared.editing)
    return (
      <CellView pending={shared.pending} error={shared.error} onStart={shared.onStart}>
        {display}
      </CellView>
    );

  const commit = (advance: boolean) => {
    if (done.current) return;
    done.current = true;
    onSave(draft, advance);
  };

  return (
    <span
      ref={wrap}
      className="flex items-center gap-1"
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => {
        if (!wrap.current?.contains(event.relatedTarget as Node | null)) commit(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commit(false);
        } else if (event.key === "Escape") {
          event.preventDefault();
          done.current = true;
          shared.onCancel();
        }
      }}
    >
      <input
        ref={first}
        autoFocus
        value={draft.min}
        inputMode="numeric"
        aria-label="Minimum production days"
        onChange={(event) => setDraft((prev) => ({ ...prev, min: event.target.value }))}
        className={inputClass}
      />
      <span className="text-muted-foreground">–</span>
      <input
        value={draft.max}
        inputMode="numeric"
        aria-label="Maximum production days"
        onChange={(event) => setDraft((prev) => ({ ...prev, max: event.target.value }))}
        onKeyDown={(event) => {
          if (event.key === "Tab" && !event.shiftKey) {
            event.preventDefault();
            commit(true);
          }
        }}
        className={inputClass}
      />
    </span>
  );
}
