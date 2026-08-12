import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import type { Category, Product, Subcategory } from "@/lib/catalog";
import {
  GROUP_LABELS,
  filterProducts,
  groupMatchers,
  type CatalogSearch,
  type FilterGroupId,
} from "@/lib/catalog-filters";
import { useFilterOptions } from "@/components/site/FilterPanel";
import { useShippingSettings } from "@/lib/shipping";
import { SourceDot } from "@/components/site/SourceDot";

/** Always shown, regardless of category selection. */
const BASE_GROUPS: FilterGroupId[] = ["moq", "prod", "src"];
/** Only shown once a single category is selected. */
const CONDITIONAL_GROUPS: FilterGroupId[] = ["deco", "colour", "mat"];

type Props = {
  products: Product[];
  categories: Category[];
  subcategories: Subcategory[];
  search: CatalogSearch;
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
  onToggle: (group: FilterGroupId, value: string) => void;
  onClear: () => void;
  activeCount: number;
};

function Row({
  label,
  count,
  checked,
  onChange,
  radio,
  indent,
  dot,
}: {
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  radio?: boolean;
  indent?: boolean;
  dot?: React.ReactNode;
}) {
  return (
    <label
      className={`flex min-h-8 cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 text-[13px] leading-[1.25] transition-colors duration-[150ms] ease-out ${
        checked ? "font-medium text-n-900" : "text-n-700"
      } hover:bg-n-50 ${indent ? "ml-4" : ""}`}
    >
      {radio ? (
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          className="mt-px size-4 shrink-0 accent-[var(--color-lime-500)]"
        />
      ) : (
        <Checkbox checked={checked} onCheckedChange={onChange} className="mt-px size-4 shrink-0" />
      )}
      {dot}
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 text-right text-[12px] leading-5 text-n-400">({count})</span>
    </label>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-n-400">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function DesktopFilterSidebar({
  products,
  categories,
  subcategories,
  search,
  selectedCategory,
  onSelectCategory,
  onToggle,
  onClear,
  activeCount,
}: Props) {
  const options = useFilterOptions(products, categories, subcategories);
  const shipping = useShippingSettings();

  const counts = useMemo(() => {
    const taxonomy = { categories, subcategories, shipping };
    const matchers = groupMatchers(taxonomy);
    const result = {} as Record<FilterGroupId, Record<string, number>>;
    for (const group of ["cat", "sub", ...BASE_GROUPS, ...CONDITIONAL_GROUPS] as FilterGroupId[]) {
      const base = filterProducts(products, search, taxonomy, group === "sub" ? "cat" : group);
      result[group] = {};
      for (const option of options[group]) {
        result[group][option.value] = base.filter((product) =>
          matchers[group](product, [option.value]),
        ).length;
      }
    }
    return result;
  }, [products, categories, subcategories, search, options, shipping]);

  const subsForSelected = useMemo(() => {
    const category = categories.find((c) => c.slug === selectedCategory);
    if (!category) return [] as Subcategory[];
    return subcategories.filter((sub) => sub.category_id === category.id);
  }, [categories, subcategories, selectedCategory]);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 pb-4">
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

      <div className="space-y-6">
        <Group label={GROUP_LABELS.cat}>
          <Row
            radio
            label="All categories"
            count={products.length}
            checked={!selectedCategory}
            onChange={() => onSelectCategory(null)}
          />
          {categories.map((category) => (
            <Row
              key={category.id}
              radio
              label={category.name}
              count={counts.cat[category.slug] ?? 0}
              checked={selectedCategory === category.slug}
              onChange={() => onSelectCategory(category.slug)}
            />
          ))}
        </Group>

        {selectedCategory && subsForSelected.length ? (
          <Group label={GROUP_LABELS.sub}>
            {subsForSelected.map((sub) => (
              <Row
                key={sub.id}
                label={sub.name}
                count={counts.sub[sub.slug] ?? 0}
                checked={search.sub.includes(sub.slug)}
                onChange={() => onToggle("sub", sub.slug)}
              />
            ))}
          </Group>
        ) : null}

        {[...BASE_GROUPS, ...(selectedCategory ? CONDITIONAL_GROUPS : [])].map((group) => {
          const rows = options[group].filter(
            (option) => (counts[group][option.value] ?? 0) > 0 || search[group].includes(option.value),
          );
          if (!rows.length) return null;
          return (
            <Group key={group} label={GROUP_LABELS[group]}>
              {rows.map((option) => (
                <Row
                  key={option.value}
                  label={option.label}
                  {...(group === "src" ? { dot: <SourceDot source={option.value} /> } : {})}
                  count={counts[group][option.value] ?? 0}
                  checked={search[group].includes(option.value)}
                  onChange={() => onToggle(group, option.value)}
                />
              ))}
            </Group>
          );
        })}
      </div>
    </div>
  );
}
