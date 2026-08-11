import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  COLOUR_OPTIONS,
  DECORATION_METHODS,
  INVENTORY_SOURCES,
  MOQ_BUCKETS,
  PRODUCTION_BUCKETS,
  type Category,
  type Product,
} from "@/lib/catalog";
import {
  GROUP_IDS,
  GROUP_LABELS,
  filterProducts,
  groupMatchers,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";

type Option = { value: string; label: string };

export function useFilterOptions(products: Product[], categories: Category[]) {
  return useMemo<Record<FilterGroupId, Option[]>>(() => {
    const materials = Array.from(
      new Set(products.map((p) => p.material).filter((m): m is string => Boolean(m))),
    ).sort();
    return {
      cat: categories.map((c) => ({ value: c.slug, label: c.name })),
      moq: MOQ_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
      prod: PRODUCTION_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
      colour: COLOUR_OPTIONS.map((c) => ({ value: c, label: c })),
      deco: DECORATION_METHODS.map((d) => ({ value: d, label: d })),
      src: INVENTORY_SOURCES.map((s) => ({ value: s, label: s })),
      mat: materials.map((m) => ({ value: m, label: m })),
    };
  }, [products, categories]);
}

function useCounts(
  products: Product[],
  categories: Category[],
  search: CatalogSearch,
  options: Record<FilterGroupId, Option[]>,
) {
  return useMemo(() => {
    const matchers = groupMatchers(categories);
    const counts = {} as Record<FilterGroupId, Record<string, number>>;
    for (const group of GROUP_IDS) {
      const base = filterProducts(products, search, categories, group);
      counts[group] = {};
      for (const option of options[group]) {
        counts[group][option.value] = base.filter((product) =>
          matchers[group](product, [option.value]),
        ).length;
      }
    }
    return counts;
  }, [products, categories, search, options]);
}

type Props = {
  products: Product[];
  categories: Category[];
  search: CatalogSearch;
  resultCount: number;
  onToggle: (group: FilterGroupId, value: string) => void;
  onClear: () => void;
  variant: "drawer" | "sidebar";
  onClose?: () => void;
};

function OptionRow({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted">
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="flex-1 text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </label>
  );
}

export function FilterPanel({
  products,
  categories,
  search,
  resultCount,
  onToggle,
  onClear,
  variant,
  onClose,
}: Props) {
  const options = useFilterOptions(products, categories);
  const counts = useCounts(products, categories, search, options);
  const [activeGroup, setActiveGroup] = useState<FilterGroupId>("cat");

  if (variant === "sidebar") {
    return (
      <div className="space-y-6">
        {GROUP_IDS.map((group) =>
          options[group].length === 0 ? null : (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS[group]}
              </p>
              <div className="mt-1.5 max-h-72 overflow-y-auto">
                {options[group].map((option) => (
                  <OptionRow
                    key={option.value}
                    label={option.label}
                    count={counts[group][option.value] ?? 0}
                    checked={search[group].includes(option.value)}
                    onChange={() => onToggle(group, option.value)}
                  />
                ))}
              </div>
            </div>
          ),
        )}
        <Button variant="outline" className="w-full" onClick={onClear}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <p className="font-display text-lg font-bold">Filters</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[42%_58%]">
        <div className="overflow-y-auto border-r border-border bg-secondary">
          {GROUP_IDS.map((group) => {
            const selected = search[group].length;
            return (
              <button
                key={group}
                type="button"
                onClick={() => setActiveGroup(group)}
                className={`flex w-full items-center justify-between gap-1 px-4 py-4 text-left text-sm font-medium ${
                  activeGroup === group
                    ? "border-l-4 border-lime bg-background text-foreground"
                    : "text-foreground hover:bg-background/60"
                }`}
              >
                <span>
                  {GROUP_LABELS[group]}
                  {selected ? (
                    <span className="ml-1.5 rounded-full bg-lime px-1.5 py-0.5 text-[10px] font-bold text-lime-foreground">
                      {selected}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="size-4 shrink-0 opacity-50" />
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto p-2">
          {options[activeGroup].length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No options available.</p>
          ) : (
            options[activeGroup].map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                count={counts[activeGroup][option.value] ?? 0}
                checked={search[activeGroup].includes(option.value)}
                onChange={() => onToggle(activeGroup, option.value)}
              />
            ))
          )}
        </div>
      </div>

      <div className="flex gap-3 border-t border-border bg-background p-4">
        <Button variant="outline" className="flex-1" onClick={onClear}>
          Clear Filters
        </Button>
        <Button className="flex-1" onClick={onClose}>
          Show {resultCount} Results
        </Button>
      </div>
    </div>
  );
}
