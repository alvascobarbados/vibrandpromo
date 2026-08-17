import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { clampQty, qtyFloor, stepQty } from "@/lib/quantity";

export function QuantityStepper({
  quantity,
  moq,
  onChange,
  tone = "light",
  size = "default",
}: {
  quantity: number;
  moq: number | null;
  onChange: (value: number) => void;
  tone?: "light" | "dark";
  size?: "default" | "compact";
}) {
  const floor = qtyFloor(moq);
  const [draft, setDraft] = useState(String(quantity));
  const [hint, setHint] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setDraft(String(quantity)), [quantity]);
  useEffect(() => () => (timer.current ? clearTimeout(timer.current) : undefined), []);

  function flashHint() {
    setHint(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHint(false), 1800);
  }

  function commit(raw: string) {
    const parsed = Number(raw.replace(/[^\d]/g, ""));
    const next = clampQty(parsed, moq);
    if (raw.trim() !== "" && parsed < floor) flashHint();
    setDraft(String(next));
    onChange(next);
  }

  const shell =
    tone === "dark"
      ? "border-white/30 text-white"
      : "bg-n-100 text-n-900";
  const btn =
    tone === "dark"
      ? "text-white hover:bg-white/15 disabled:text-white/30"
      : "text-n-700 hover:bg-n-200 disabled:text-n-400";

  const compact = size === "compact";

  return (
    <div
      className={`relative shrink-0 ${
        compact ? "w-auto" : "w-full [@container(min-width:280px)]:w-auto"
      }`}
    >
      <div
        className={`${
          compact
            ? "inline-flex h-9 w-auto items-center justify-start rounded-full"
            : "flex h-10 w-full items-center justify-between rounded-full [@container(min-width:280px)]:inline-flex [@container(min-width:280px)]:w-auto [@container(min-width:280px)]:justify-start"
        } ${
          tone === "dark" ? "border" : ""
        } ${shell}`}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={quantity <= floor}
          onClick={() => onChange(stepQty(quantity, -1, moq))}
          className={`inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-[150ms] ease-out focus-visible:ring-2 focus-visible:ring-lime-500 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
            compact ? "size-8" : "size-10 [@container(min-width:280px)]:size-9"
          } ${btn}`}
        >
          <Minus className="size-3.5" />
        </button>
        <input
          aria-label="Quantity"
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit((event.target as HTMLInputElement).value);
            }
          }}
          style={{ width: `${Math.max(2, Math.min(draft.length, 6))}ch` }}
          className="card-value border-0 bg-transparent p-0 text-center outline-none"
        />
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onChange(stepQty(quantity, 1, moq))}
          className={`inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-colors duration-[150ms] ease-out focus-visible:ring-2 focus-visible:ring-lime-500 ${
            compact ? "size-8" : "size-10 [@container(min-width:280px)]:size-9"
          } ${btn}`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {hint ? (
        <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-n-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Minimum {floor}
        </span>
      ) : null}
    </div>
  );
}