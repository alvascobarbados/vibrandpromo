import { requirePage } from "@/lib/admin-guard";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { parseCsvRecords } from "@/lib/csv";
import { categoriesQuery, subcategoriesQuery, slugify, productionLabel } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/import")({
  beforeLoad: ({ context }) => requirePage(context.access, "import"),
  head: () => ({
    meta: [
      { title: "Import Products | Vibrand Admin" },
      { name: "description", content: "Bulk update the catalogue from a spreadsheet." },
      { property: "og:title", content: "Import Products | Vibrand Admin" },
      { property: "og:description", content: "Upload a CSV to create or update products." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminImport,
});

const COLUMNS = [
  "sku",
  "name",
  "category",
  "subcategory",
  "inventory_source",
  "moq",
  "production_days",
  "colour_option",
  "decoration_methods",
  "material",
  "size",
  "capacity",
  "weight",
  "features",
  "is_active",
] as const;

type Row = Record<string, string>;

type Prepared = {
  sku: string;
  payload: Record<string, unknown>;
};

type Problem = { line: number; sku: string; reason: string };

type Result = { created: number; updated: number; skipped: Problem[] };

function AdminImport() {
  const queryClient = useQueryClient();
  const categories = useQuery(categoriesQuery);
  const subcategories = useQuery(subcategoriesQuery);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [ready, setReady] = useState<Prepared[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const loading = categories.isLoading || subcategories.isLoading;

  function prepare(records: Row[]) {
    const subIndex = new Map<string, { id: string; category_id: string }>();
    for (const sub of subcategories.data ?? []) {
      const category = (categories.data ?? []).find((c) => c.id === sub.category_id);
      if (!category) continue;
      subIndex.set(`${category.name.toLowerCase()}||${sub.name.toLowerCase()}`, {
        id: sub.id,
        category_id: sub.category_id,
      });
    }

    const found: Problem[] = [];
    const prepared: Prepared[] = [];
    const seen = new Set<string>();

    records.forEach((row, i) => {
      const line = i + 2;
      const sku = (row["sku"] ?? "").trim();
      const name = (row["name"] ?? "").trim();
      if (!sku) {
        found.push({ line, sku: "—", reason: "No product code (SKU) in this row" });
        return;
      }
      if (!name) {
        found.push({ line, sku, reason: "No product name in this row" });
        return;
      }
      if (seen.has(sku.toLowerCase())) {
        found.push({ line, sku, reason: "This product code appears more than once in the file" });
        return;
      }
      const match = subIndex.get(
        `${(row["category"] ?? "").trim().toLowerCase()}||${(row["subcategory"] ?? "").trim().toLowerCase()}`,
      );
      if (!match) {
        found.push({
          line,
          sku,
          reason: `Category "${row["category"] ?? ""}" / subcategory "${row["subcategory"] ?? ""}" was not found in the catalogue`,
        });
        return;
      }
      seen.add(sku.toLowerCase());
      const methods = (row["decoration_methods"] ?? "")
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean);
      const moq = (row["moq"] ?? "").trim();
      const shipping = (row["shipping_methods"] ?? "").trim().toLowerCase() || "air_sea";
      if (!["air_sea", "air_only", "sea_only"].includes(shipping)) {
        found.push({
          line,
          sku,
          reason: `Shipping "${(row["shipping_methods"] ?? "").trim()}" is not valid — use air_sea, air_only or sea_only (or leave blank for air_sea)`,
        });
        return;
      }
      const num = (key: string) => {
        const raw = (row[key] ?? "").trim();
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const rushRaw = (row["rush_enabled"] ?? "").trim().toLowerCase();
      if (rushRaw && !["true", "false", "yes", "no", "1", "0"].includes(rushRaw)) {
        found.push({
          line,
          sku,
          reason: `Rush "${(row["rush_enabled"] ?? "").trim()}" is not valid — use true or false (or leave blank for false)`,
        });
        return;
      }
      const rushEnabled = ["true", "yes", "1"].includes(rushRaw);
      // production_days stays supported as the fixed/minimum production time.
      const normalMin = num("production_min_days") ?? num("production_days");
      const normalMax = num("production_max_days");
      const rushMin = num("rush_production_min_days") ?? num("rush_production_days");
      const rushMax = num("rush_production_max_days");
      if (normalMax != null && (normalMin == null || normalMax < normalMin)) {
        found.push({
          line,
          sku,
          reason: "production_max_days must be a number greater than or equal to the minimum",
        });
        return;
      }
      if (rushEnabled) {
        if (shipping === "sea_only") {
          found.push({ line, sku, reason: "Rush requires air shipping — this row is sea only" });
          return;
        }
        if (rushMin == null || rushMin < 1) {
          found.push({
            line,
            sku,
            reason:
              "Rush is on, so rush_production_min_days must be a whole number of 1 or more",
          });
          return;
        }
        if (rushMax != null && rushMax < rushMin) {
          found.push({
            line,
            sku,
            reason:
              "rush_production_max_days must be greater than or equal to rush_production_min_days",
          });
          return;
        }
        if (normalMin == null || rushMin >= normalMin) {
          found.push({
            line,
            sku,
            reason: "rush_production_min_days must be less than the normal production minimum",
          });
          return;
        }
      }
      prepared.push({
        sku,
        payload: {
          sku,
          name,
          slug: `${slugify(name)}-${slugify(sku)}`,
          category_id: match.category_id,
          subcategory_id: match.id,
          inventory_source: (row["inventory_source"] ?? "").trim() || "Factory Direct",
          moq: moq ? Number(moq) : null,
          production_min_days: normalMin,
          production_max_days: normalMax,
          shipping_methods: shipping,
          rush_enabled: rushEnabled,
          rush_production_min_days: rushEnabled ? rushMin : null,
          rush_production_max_days: rushEnabled ? rushMax : null,
          colour_option: (row["colour_option"] ?? "").trim() || null,
          decoration_methods: methods,
          material: (row["material"] ?? "").trim() || null,
          size: (row["size"] ?? "").trim() || null,
          capacity: (row["capacity"] ?? "").trim() || null,
          weight: (row["weight"] ?? "").trim() || null,
          features: (row["features"] ?? "").trim() || null,
          is_active: (row["is_active"] ?? "").trim().toLowerCase() !== "false",
        },
      });
    });

    setProblems(found);
    setReady(prepared);
  }

  async function handleFile(file: File) {
    setResult(null);
    const text = await file.text();
    const { headers, records } = parseCsvRecords(text);
    const missing = COLUMNS.filter((column) => !headers.includes(column));
    setFileName(file.name);
    setMissingColumns(missing);
    setRows(records);
    if (missing.length) {
      setReady([]);
      setProblems([]);
      return;
    }
    prepare(records);
  }

  async function runImport() {
    setImporting(true);
    try {
      const { data: existing, error: readError } = await supabase
        .from("products")
        .select("sku")
        .not("sku", "is", null);
      if (readError) throw readError;
      const existingSkus = new Set((existing ?? []).map((p) => (p.sku ?? "").toLowerCase()));

      let created = 0;
      let updated = 0;
      const failed: Problem[] = [...problems];

      for (let i = 0; i < ready.length; i += 50) {
        const batch = ready.slice(i, i + 50);
        const { error } = await supabase.from("products").upsert(
          batch.map((item) => item.payload as never),
          { onConflict: "sku" },
        );
        if (error) {
          for (const item of batch) {
            failed.push({ line: 0, sku: item.sku, reason: error.message });
          }
          continue;
        }
        for (const item of batch) {
          if (existingSkus.has(item.sku.toLowerCase())) updated += 1;
          else created += 1;
        }
      }

      setResult({ created, updated, skipped: failed });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Import finished — ${created} created, ${updated} updated`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold">Import products</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a spreadsheet saved as CSV to add new products and update existing ones. Products are
        matched on their product code (SKU): a code we already have is updated, a new code is added.
        Nothing is deleted.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm font-semibold">Your file needs these column headings</p>
        <p className="mt-2 break-words rounded-lg bg-secondary p-3 font-mono text-xs">
          {COLUMNS.join(", ")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Optional extra column: <span className="font-mono">shipping_methods</span> — accepts
          air_sea, air_only or sea_only. Leave it out or blank and the product is treated as Air &
          Sea.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Production time can be a range. <span className="font-mono">production_days</span> (or{" "}
          <span className="font-mono">production_min_days</span>) is the fixed or minimum time, and
          the optional <span className="font-mono">production_max_days</span> makes it a range.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Optional rush columns: <span className="font-mono">rush_enabled</span> (true/false),{" "}
          <span className="font-mono">rush_production_min_days</span> and optional{" "}
          <span className="font-mono">rush_production_max_days</span>. When rush is true the rush
          minimum must be less than the normal production minimum, and the product cannot be sea
          only.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Leave MOQ or production days blank if they are on request. Customer-facing lead times are
          calculated automatically from production time plus the global shipping settings, so
          never put a smaller number in the max column than in the min column. Separate several
          decoration methods with a vertical bar, like Screen Printing | Heat Transfer. Put false in
          the is_active column to keep a product hidden from the public site.
        </p>

        <label
          htmlFor="csv-file"
          className="mt-5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground hover:border-primary"
        >
          <Upload className="size-4" />
          {fileName ? `Selected: ${fileName} — choose another file` : "Choose a CSV file"}
        </label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {loading ? <Skeleton className="mt-6 h-24 rounded-2xl" /> : null}

      {fileName && !loading ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 font-semibold">
            <FileSpreadsheet className="size-4" /> Preview
          </div>

          {missingColumns.length ? (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              These column headings are missing: {missingColumns.join(", ")}. Please fix the file
              and upload again.
            </p>
          ) : (
            <>
              <p className="text-sm">
                {rows.length} rows found · {ready.length} ready to import · {problems.length} with
                problems
              </p>

              {ready.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="py-2 pr-4">SKU</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">MOQ</th>
                        <th className="py-2 pr-4">Production</th>
                        <th className="py-2 pr-4">Visible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ready.slice(0, 5).map((item) => (
                        <tr key={item.sku} className="border-t border-border">
                          <td className="py-2 pr-4 font-medium">{item.sku}</td>
                          <td className="py-2 pr-4">{String(item.payload["name"])}</td>
                          <td className="py-2 pr-4">
                            {item.payload["moq"] == null
                              ? "On request"
                              : String(item.payload["moq"])}
                          </td>
                          <td className="py-2 pr-4">
                            {productionLabel(
                              item.payload["production_min_days"] as number | null,
                              item.payload["production_max_days"] as number | null,
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            {item.payload["is_active"] ? "Yes" : "Hidden"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {problems.length ? (
                <div className="rounded-lg bg-secondary p-3 text-sm">
                  <p className="font-semibold">Rows we cannot import yet</p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    {problems.slice(0, 20).map((problem, index) => (
                      <li key={`${problem.sku}-${index}`}>
                        Row {problem.line} ({problem.sku}): {problem.reason}
                      </li>
                    ))}
                  </ul>
                  {problems.length > 20 ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      …and {problems.length - 20} more.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <Button disabled={!ready.length || importing} onClick={() => void runImport()}>
                {importing ? "Importing…" : `Import ${ready.length} products`}
              </Button>
            </>
          )}
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <p className="font-semibold">Import report</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>{result.created} products created</li>
            <li>{result.updated} products updated</li>
            <li>{result.skipped.length} rows skipped</li>
          </ul>
          {result.skipped.length ? (
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              {result.skipped.slice(0, 20).map((problem, index) => (
                <li key={`${problem.sku}-${index}`}>
                  {problem.sku}: {problem.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
