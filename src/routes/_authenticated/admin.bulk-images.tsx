import { requirePage } from "@/lib/admin-guard";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { allProductsQuery } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin/bulk-images")({
  beforeLoad: ({ context }) => requirePage(context.access, "bulk_images"),
  head: () => ({
    meta: [
      { title: "Bulk Image Upload | Vibrand Admin" },
      { name: "description", content: "Attach many product photos at once using SKU filenames." },
      { property: "og:title", content: "Bulk Image Upload | Vibrand Admin" },
      { property: "og:description", content: "Drop photos named by product code to attach them." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BulkImages,
});

type Report = { attached: string[]; unmatched: string[] };

function parseName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").trim();
  const match = /^(.+?)(?:[-_](\d+))?$/.exec(base);
  if (!match) return { sku: base, order: 0 };
  return { sku: match[1] ?? base, order: match[2] ? Number(match[2]) : 0 };
}

function BulkImages() {
  const queryClient = useQueryClient();
  const products = useQuery(allProductsQuery);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setReport(null);
    try {
      const bySku = new Map(
        (products.data ?? [])
          .filter((product) => product.sku)
          .map((product) => [product.sku!.toLowerCase(), product] as const),
      );

      const groups = new Map<string, { order: number; file: File }[]>();
      const unmatched: string[] = [];

      for (const file of files) {
        const { sku, order } = parseName(file.name);
        const key = sku.toLowerCase();
        if (!bySku.has(key)) {
          unmatched.push(file.name);
          continue;
        }
        const list = groups.get(key) ?? [];
        list.push({ order, file });
        groups.set(key, list);
      }

      const attached: string[] = [];

      for (const [key, list] of groups) {
        const product = bySku.get(key)!;
        const sorted = [...list].sort((a, b) => a.order - b.order);
        const urls: string[] = [];
        for (const entry of sorted) {
          const path = `${crypto.randomUUID()}-${entry.file.name.replace(/[^\w.-]+/g, "_")}`;
          const { error } = await supabase.storage
            .from("product-images")
            .upload(path, entry.file);
          if (error) throw error;
          urls.push(path);
        }
        const { error: updateError } = await supabase
          .from("products")
          .update({ images: urls })
          .eq("id", product.id);
        if (updateError) throw updateError;
        attached.push(`${product.sku} — ${urls.length} photo${urls.length === 1 ? "" : "s"}`);
      }

      setReport({ attached, unmatched });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${attached.length} products updated`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const missingCount = (products.data ?? []).filter((p) => (p.images ?? []).length === 0).length;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Bulk image upload</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Drop in as many photos as you like. Each photo is attached to the product whose code matches
        the file name — 102006.jpg goes to product 102006. To control the order, number them:
        102006-1.jpg, 102006-2.jpg, and so on. Uploading photos for a product replaces the photos it
        already has.
      </p>
      <p className="mt-2 text-sm font-medium">{missingCount} products still have no photos.</p>

      <label
        htmlFor="bulk-files"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFiles(Array.from(event.dataTransfer.files));
        }}
        className="mt-6 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground hover:border-primary"
      >
        <ImageUp className="size-6" />
        {busy ? "Uploading…" : "Drop photos here, or click to choose files"}
      </label>
      <input
        id="bulk-files"
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          void handleFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {report ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 text-sm">
          <div>
            <p className="font-semibold">Attached ({report.attached.length} products)</p>
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {report.attached.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-semibold">No matching product code ({report.unmatched.length} files)</p>
            {report.unmatched.length ? (
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {report.unmatched.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted-foreground">Every file matched a product.</p>
            )}
          </div>
          <Button variant="outline" onClick={() => setReport(null)}>
            Clear report
          </Button>
        </div>
      ) : null}
    </div>
  );
}
