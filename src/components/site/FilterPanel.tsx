import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AIR_LEAD_BUCKETS,
  COLOUR_OPTIONS,
  DECORATION_METHODS,
  INVENTORY_SOURCES,
  MOQ_BUCKETS,
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
import { useShippingSettings, type ShippingMap } from "@/lib/shipping";
import { SourceDot } from "@/components/site/SourceDot";

type Option = { value: string; label: string };

/**
 * Subcategories are rendered nested inside the category tree. Inventory source
 * sits directly after lead time and is always available.
 */
const PANEL_GROUPS: FilterGroupId[] = ["cat", "moq", "prod", "src", "deco", "colour", "mat"];

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
      prod: AIR_LEAD_BUCKETS.map((b) => ({ value: b.id, label: b.label })),
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
  shipping: ShippingMap,
) {
  return useMemo(() => {
    const taxonomy = { categories, subcategories, shipping };
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
  }, [products, categories, subcategories, search, options, shipping]);
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
  /** On a category page the category is fixed: only its subcategories show. */
  fixedCategoryId?: string;
  activeCount?: number;
  onClose?: () => void;
  showLabel?: string;
};

function OptionRow({
  label,
  count,
  checked,
  onChange,
  indent,
  dot,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  indent?: boolean;
  dot?: React.ReactNode;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-2 text-[13px] leading-[1.5] transition-colors duration-[150ms] ease-out lg:text-sm ${
        checked ? "font-medium text-n-900" : "text-n-700"
      } hover:bg-n-50 ${indent ? "ml-4" : ""}`}
    >
      <Checkbox checked={checked} onCheckedChange={onChange} />
      {dot}
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 text-[11px] text-n-500">({count})</span>
    </label>
  );
}

function GroupBlock({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 py-1.5 text-left"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-n-500">
          {label}
        </span>
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-n-500" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-n-500" />
        )}
      </button>
      {open ? <div className="mt-1">{children}</div> : null}
    </div>
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
  fixedCategoryId,
  activeCount = 0,
  onClose,
  showLabel,
}: Props) {
  const options = useFilterOptions(products, categories, subcategories);
  const shipping = useShippingSettings();
  const counts = useCounts(products, categories, subcategories, search, options, shipping);
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

  function subRows(categoryId: string, indent: boolean) {
    return (subsByCategory.get(categoryId) ?? [])
      .filter((sub) => (counts.sub[sub.slug] ?? 0) > 0 || search.sub.includes(sub.slug))
      .map((sub) => (
        <OptionRow
          key={sub.id}
          indent={indent}
          label={sub.name}
          count={counts.sub[sub.slug] ?? 0}
          checked={search.sub.includes(sub.slug)}
          onChange={() => onToggle("sub", sub.slug)}
        />
      ));
  }

  function renderCategoryTree() {
    if (fixedCategoryId) return subRows(fixedCategoryId, false);
    return categories
      .filter(
        (category) => (counts.cat[category.slug] ?? 0) > 0 || search.cat.includes(category.slug),
      )
      .map((category) => {
        const open = expanded.includes(category.id);
        const subs = subRows(category.id, true);
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
                  className="shrink-0 rounded-full p-1.5 text-n-500 hover:bg-n-50 hover:text-n-700"
                >
                  {open ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              ) : null}
            </div>
            {open ? subs : null}
          </div>
        );
      });
  }

  const groups = (
    <div className="space-y-5">
      {PANEL_GROUPS.map((group) => {
        if (group === "cat") {
          const rows = renderCategoryTree();
          if (!rows.length) return null;
          return (
            <GroupBlock key={group} label={fixedCategoryId ? "Subcategory" : GROUP_LABELS.cat}>
              {rows}
            </GroupBlock>
          );
        }
        if (options[group].length === 0) return null;
        return (
          <GroupBlock key={group} label={GROUP_LABELS[group]} defaultOpen={group === "moq"}>
            {options[group].map((option) => (
              <OptionRow
                key={option.value}
                label={option.label}
                {...(group === "src" ? { dot: <SourceDot source={option.value} /> } : {})}
                count={counts[group][option.value] ?? 0}
                checked={search[group].includes(option.value)}
                onChange={() => onToggle(group, option.value)}
              />
            ))}
          </GroupBlock>
        );
      })}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 pb-3">
          <p className="text-sm font-semibold text-n-900">Filters</p>
          {activeCount ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-navy-500 hover:text-navy-700 hover:underline"
            >
              Clear all
            </button>
          ) : null}
        </div>
        {groups}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-n-200 px-4 py-3">
        <p className="font-display text-lg font-bold text-n-900">Filters</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{groups}</div>

      <div className="flex gap-3 border-t border-n-200 bg-white p-4">
        <Button
          variant="outline"
          className="flex-1 border-n-200 text-navy-500 hover:bg-navy-50 hover:text-navy-700"
          onClick={onClear}
        >
          Clear filters
        </Button>
        <Button className="flex-1 bg-lime-500 text-n-700 hover:bg-lime-300" onClick={onClose}>
          {showLabel ?? `Show ${resultCount} results`}
        </Button>
      </div>
    </div>
  );
}
