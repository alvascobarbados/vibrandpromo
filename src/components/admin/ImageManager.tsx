/**
 * The product image manager: upload, drag to reorder, remove. Extracted from
 * the expanded product editor so the /team Pricelist opens the very same
 * manager instead of a second implementation.
 */
import { Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { imageSrc } from "@/lib/catalog";

export function ImageManager({
  images,
  onChange,
  inputId,
  label = "Images",
}: {
  images: string[];
  onChange: (next: string[]) => void;
  inputId: string;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      onChange([...images, path]);
      toast.success("Image uploaded");
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <label
        htmlFor={inputId}
        className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary"
      >
        <Upload className="size-4" />
        {uploading ? "Uploading…" : "Upload an image"}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />
      {images.length ? (
        <>
          <p className="mt-3 text-xs text-muted-foreground">
            Drag an image to reorder. The first image is the cover shown on the product card.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {images.map((image, index) => (
              <div
                key={image}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex === null || dragIndex === index) return;
                  const next = [...images];
                  const moved = next.splice(dragIndex, 1)[0];
                  if (moved !== undefined) {
                    next.splice(index, 0, moved);
                    onChange(next);
                  }
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`relative cursor-grab active:cursor-grabbing ${
                  dragIndex === index ? "opacity-50" : ""
                }`}
              >
                <img
                  src={imageSrc(image)}
                  alt=""
                  loading="lazy"
                  className="size-20 rounded-lg border border-border object-cover"
                />
                {index === 0 ? (
                  <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-n-900/80 py-0.5 text-center text-[10px] font-semibold uppercase text-white">
                    Cover
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => onChange(images.filter((value) => value !== image))}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}