import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

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
  type Subcategory,
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

const PANEL_GROUPS: FilterGroupId[] = GROUP_IDS.filter((group) => group !== "sub");

export function useFilterOptions(
  products: Product[],
  categories: Category[],
  subcategories: Subcategory[],
) {
  return useMemo<Record<FilterGroupId, Option[]>>(() => {
    const materials = Array.from(
      new Set(products.map((p) => p.material).filter((m): m is string => Boolean(m))),
    ).sort();
    return {
      cat: categories.map((c) => ({ value: c.slug, label: c.name })),
      sub: subcategories.map((s) => ({ value: s.slug, label: s.name })),
      moq: MOQ_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
      prod: PRODUCTION_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
      colour: COLOUR_OPTIONS.map((c) => ({ value: c, label: c })),
      deco: DECORATION_METHODS.map((d) => ({ value: d, label: d })),
      src: INVENTORY_SOURCES.map((s) => ({ value: s, label: s })),
      mat: materials.map((m) => ({ value: m, label: m })),
    };
  }, [products, categories, subcategories]);
}

function useCounts(
  products: Product[],
  categories: Category[],
  subcategories: Subcategory[],
  search: CatalogSearch,
  options: Record<FilterGroupId, Option[]>,
) {
  return useMemo(() => {
    const taxonomy = { categories, subcategories };
    const matchers = groupMatchers(taxonomy);
    const counts = {} as Record<FilterGroupId, Record<string, number>>;
    for (const group of GROUP_IDS) {
      const base = filterProducts(products, search, taxonomy, group === "sub" ? "cat" : group);
      counts[group] = {};
      for (const option of options[group]) {
        counts[group][option.value] = base.filter((product) =>
          matchers[group](product, [option.value]),
        ).length;
      }
    }
    return counts;
  }, [products, categories, subcategories, search, options]);
}

type Props = {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
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
  indent,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  indent?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-full px-2.5 py-2.5 text-sm transition-colors ${
        checked ? "bg-lime text-lime-foreground" : "hover:bg-muted"
      } ${indent ? "ml-5" : ""}`}
    >
      <Checkbox checked={checked} onCheckedChange={onChange} />
      <span className="flex-1">{label}</span>
      <span className={`text-xs ${checked ? "text-lime-foreground/70" : "text-muted-foreground"}`}>
        ({count})
      </span>
    </label>
  );
}

export function FilterPanel({
  products,
  categories,
  subcategories,
  search,
  resultCount,
  onToggle,
  onClear,
  variant,
  onClose,
}: Props) {
  const options = useFilterOptions(products, categories, subcategories);
  const counts = useCounts(products, categories, subcategories, search, options);
  const [activeGroup, setActiveGroup] = useState<FilterGroupId>("cat");
  const [expanded, setExpanded] = useState<string[]>([]);

  const subsByCategory = useMemo(() => {
    const map = new Map<string, Subcategory[]>();
    for (const sub of subcategories) {
      const list = map.get(sub.category_id) ?? [];
      list.push(sub);
      map.set(sub.category_id, list);
    }
    return map;
  }, [subcategories]);

  function renderCategoryTree() {
    return categories
      .filter((category) => (counts.cat[category.slug] ?? 0) > 0 || search.cat.includes(category.slug))
      .map((category) => {
        const open = expanded.includes(category.id);
        const subs = (subsByCategory.get(category.id) ?? []).filter(
          (sub) => (counts.sub[sub.slug] ?? 0) > 0 || search.sub.includes(sub.slug),
        );
        return (
          <div key={category.id}>
            <div className="flex items-center">
              <div className="min-w-0 flex-1">
                <OptionRow
                  label={category.name}
                  count={counts.cat[category.slug] ?? 0}
                  checked={search.cat.includes(category.slug)}
                  onChange={() => onToggle("cat", category.slug)}
                />
              </div>
              {subs.length ? (
                <button
                  type="button"
                  aria-label={open ? `Collapse ${category.name}` : `Expand ${category.name}`}
                  aria-expanded={open}
                  onClick={() =>
                    setExpanded((prev) =>
                      prev.includes(category.id)
                        ? prev.filter((id) => id !== category.id)
                        : [...prev, category.id],
                    )
                  }
                  className="shrink-0 rounded-full p-1.5 text-charcoal hover:bg-muted"
                >
                  {open ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              ) : null}
            </div>
            {open
              ? subs.map((sub) => (
                  <OptionRow
                    key={sub.id}
                    indent
                    label={sub.name}
                    count={counts.sub[sub.slug] ?? 0}
                    checked={search.sub.includes(sub.slug)}
                    onChange={() => onToggle("sub", sub.slug)}
                  />
                ))
              : null}
          </div>
        );
      });
  }

  if (variant === "sidebar") {
    return (
      <div className="space-y-6">
        {PANEL_GROUPS.map((group) =>
          options[group].length === 0 ? null : (
            <div key={group}>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {GROUP_LABELS[group]}
              </p>
              <div className="mt-1.5 max-h-72 overflow-y-auto">
                {group === "cat"
                  ? renderCategoryTree()
                  : options[group].map((option) => (
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
          {PANEL_GROUPS.map((group) => {
            const selected = group === "cat" ? search.cat.length + search.sub.length : search[group].length;
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
          {activeGroup === "cat" ? (
            renderCategoryTree()
          ) : options[activeGroup].length === 0 ? (
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
        <Button
          className="flex-1 bg-lime text-lime-foreground hover:bg-lime/90"
          onClick={onClose}
        >
          Show {resultCount} Results
        </Button>
      </div>
    </div>
  );
}
