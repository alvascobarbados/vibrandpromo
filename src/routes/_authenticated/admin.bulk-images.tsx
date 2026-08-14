import { requirePage } from "@/lib/admin-guard";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { allProductsQuery, imageSrc } from "@/lib/catalog";
import { generateVariantsFor, uploadWithVariants } from "@/lib/image-upload";
import { isVariantPath, variantPath, VARIANT_KEYS } from "@/lib/image-variants";
import { listProductImageObjects } from "@/lib/image-variants.functions";

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

type VariantReport = {
  originals: number;
  generated: number;
  skipped: number;
  failures: number;
  notes: string[];
};

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
  const [replaceMode, setReplaceMode] = useState(false);
  const listObjects = useServerFn(listProductImageObjects);
  const [variantBusy, setVariantBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [variantReport, setVariantReport] = useState<VariantReport | null>(null);

  /**
   * One-time backfill: walks every original in the bucket and writes the two
   * missing derivatives. Resizing happens here in the browser because the
   * server runtime has no image toolchain. Safe to re-run — existing variants
   * are skipped.
   */
  async function runVariantBatch() {
    setVariantBusy(true);
    setVariantReport(null);
    setProgress(null);
    try {
      const names = await listObjects();
      const existing = new Set(names);
      const originals = names.filter((name) => !isVariantPath(name));
      let generated = 0;
      let skipped = 0;
      let failures = 0;
      const notes: string[] = [];
      let done = 0;
      setProgress({ done: 0, total: originals.length });

      const cursor = { i: 0 };
      const worker = async () => {
        for (;;) {
          const index = cursor.i++;
          const path = originals[index];
          if (!path) return;
          const missing = VARIANT_KEYS.filter((key) => !existing.has(variantPath(path, key)));
          if (!missing.length) {
            skipped += 1;
          } else {
            try {
              const response = await fetch(imageSrc(path));
              if (!response.ok) throw new Error(`download ${response.status}`);
              const blob = await response.blob();
              await generateVariantsFor(path, blob);
              generated += missing.length;
            } catch (error) {
              failures += 1;
              if (notes.length < 20) notes.push(`${path} — ${(error as Error).message}`);
            }
          }
          done += 1;
          setProgress({ done, total: originals.length });
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      setVariantReport({ originals: originals.length, generated, skipped, failures, notes });
      toast.success(`${generated} variants generated`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Thumbnail job failed");
    } finally {
      setVariantBusy(false);
    }
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
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

    if (replaceMode && groups.size) {
      const confirmed = window.confirm(
        `Replace mode is on. All existing photos will be deleted for ${groups.size} product${
          groups.size === 1 ? "" : "s"
        } and replaced with the files you just chose. Continue?`,
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setReport(null);
    try {
      const attached: string[] = [];

      for (const [key, list] of groups) {
        const product = bySku.get(key)!;
        const sorted = [...list].sort((a, b) => a.order - b.order);
        const urls: string[] = [];
        for (const entry of sorted) {
          // Uploads write the original plus both derivatives.
          const path = await uploadWithVariants(entry.file);
          urls.push(path);
        }
        const previous = (product.images ?? []).filter(
          (value) => typeof value === "string" && !/^https?:\/\//i.test(value),
        );
        const nextImages = replaceMode ? urls : [...(product.images ?? []), ...urls];
        const { error: updateError } = await supabase
          .from("products")
          .update({ images: nextImages })
          .eq("id", product.id);
        if (updateError) throw updateError;
        if (replaceMode && previous.length) {
          await supabase.storage.from("product-images").remove(previous);
        }
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
        102006-1.jpg, 102006-2.jpg, and so on. By default new photos are added to the photos a
        product already has.
      </p>
      <p className="mt-2 text-sm font-medium">{missingCount} products still have no photos.</p>

      <label className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <Switch
          checked={replaceMode}
          onCheckedChange={setReplaceMode}
          aria-label="Replace existing images"
        />
        <span>
          <span className="font-medium">Replace existing images</span>
          <span className="block text-muted-foreground">
            Deletes every current photo for each matched product before adding the new ones.
          </span>
        </span>
      </label>

      <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <p className="font-medium">Thumbnail variants</p>
        <p className="mt-1 text-muted-foreground">
          Builds a 480px card image and a 96px thumbnail for every photo already in storage so the
          catalogue no longer downloads full-size originals. New uploads get both automatically.
          Safe to run again — photos that already have variants are skipped.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Button variant="outline" disabled={variantBusy} onClick={() => void runVariantBatch()}>
            {variantBusy ? "Generating…" : "Generate missing thumbnails"}
          </Button>
          {progress ? (
            <span className="text-muted-foreground">
              {progress.done} / {progress.total} photos
            </span>
          ) : null}
        </div>
        {variantReport ? (
          <div className="mt-3 text-muted-foreground">
            <p>
              {variantReport.originals} originals · {variantReport.generated} generated ·{" "}
              {variantReport.skipped} skipped · {variantReport.failures} failures
            </p>
            {variantReport.notes.length ? (
              <ul className="mt-1 space-y-0.5">
                {variantReport.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

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
            <p className="font-semibold">
              No matching product code ({report.unmatched.length} files)
            </p>
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
