import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { clampQty, qtyFloor, stepQty } from "@/lib/quantity";

export function QuantityStepper({
  quantity,
  moq,
  onChange,
  tone = "light",
}: {
  quantity: number;
  moq: number | null;
  onChange: (value: number) => void;
  tone?: "light" | "dark";
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
      : "border-n-200 bg-white text-n-900";
  const btn =
    tone === "dark"
      ? "text-white hover:bg-white/15 disabled:text-white/30"
      : "text-n-700 hover:bg-n-50 disabled:text-n-300";

  return (
    <div className="relative w-full shrink-0 [@container(min-width:200px)]:w-auto">
      <div
        className={`flex h-10 w-full items-center justify-between rounded-full border [@container(min-width:200px)]:inline-flex [@container(min-width:200px)]:w-auto [@container(min-width:200px)]:justify-start ${shell}`}
      >
        <button
          type="button"
          aria-label="Decrease quantity"
          disabled={quantity <= floor}
          onClick={() => onChange(stepQty(quantity, -1, moq))}
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:hover:bg-transparent ${btn}`}
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
          className={`border-0 bg-transparent p-0 text-center font-medium tabular-nums outline-none ${
            draft.length >= 5 ? "text-[12px]" : "text-[13px]"
          }`}
        />
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onChange(stepQty(quantity, 1, moq))}
          className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors ${btn}`}
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