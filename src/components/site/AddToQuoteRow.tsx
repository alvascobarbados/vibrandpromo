import { Link } from "@tanstack/react-router";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { QuantityStepper } from "@/components/site/QuantityStepper";
import { productImage, type Product } from "@/lib/catalog";
import { qtyFloor } from "@/lib/quantity";
import { useQuoteList } from "@/lib/quote-list";

export function AddToQuoteRow({
  product,
  tone = "light",
}: {
  product: Product;
  tone?: "light" | "dark";
}) {
  const { addItem, items } = useQuoteList();
  const existing = items.find((item) => item.productId === product.id);
  const [quantity, setQuantity] = useState(() => qtyFloor(product.moq));

  if (existing) {
    return (
      <Link
        to="/quote"
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-lime-500 px-3 text-[12px] font-medium text-n-700 transition-colors hover:bg-lime-300"
      >
        <Check className="size-3.5" /> In quote · {existing.quantity}
      </Link>
    );
  }

  const add = () => {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: productImage(product),
      quantity,
      notes: "",
      moq: product.moq,
    });
    toast.success(`${product.name} added — quantity ${quantity}`);
  };

  return (
    <div className="flex items-center gap-2">
      <QuantityStepper quantity={quantity} moq={product.moq} onChange={setQuantity} tone={tone} />
      <button
        type="button"
        onClick={add}
        className={`inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors ${
          tone === "dark"
            ? "border-white/40 text-white hover:border-navy-700 hover:bg-navy-700 active:bg-navy-700"
            : "border-n-200 bg-white text-n-900 hover:border-navy-700 hover:bg-navy-700 hover:text-white active:border-navy-700 active:bg-navy-700 active:text-white"
        }`}
      >
        <Plus className="size-3.5" /> Add
      </button>
    </div>
  );
}