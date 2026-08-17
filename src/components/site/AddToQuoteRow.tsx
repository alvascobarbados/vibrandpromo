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
  layout = "row",
  variant = "outline",
  onQuantityChange,
}: {
  product: Product;
  tone?: "light" | "dark";
  layout?: "row";
  /** "primary" = navy solid button (expanded card CTA). */
  variant?: "outline" | "primary";
  onQuantityChange?: (quantity: number) => void;
}) {
  const { addItem, items } = useQuoteList();
  const existing = items.find((item) => item.productId === product.id);
  const [quantity, setQuantity] = useState(() => qtyFloor(product.moq));
  const setQty = (value: number) => {
    setQuantity(value);
    onQuantityChange?.(value);
  };

  if (existing) {
    return (
      <Link
        to="/quote"
        className="card-value inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-lime-500 px-3 transition-colors duration-[150ms] ease-out hover:bg-lime-300"
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

  const buttonClass =
    variant === "primary"
      ? "border-transparent bg-navy-700 !text-white shadow-card hover:bg-navy-500"
      : tone === "dark"
        ? "border-white/40 !text-white hover:border-navy-700 hover:bg-navy-700 active:bg-navy-700"
        : "border-n-200 bg-white hover:border-navy-700 hover:bg-navy-700 hover:!text-white active:border-navy-700 active:bg-navy-700 active:!text-white";

  return (
    <div className="flex flex-col items-stretch gap-2 [@container(min-width:340px)]:flex-row">
      <div className="shrink-0">
        <QuantityStepper quantity={quantity} moq={product.moq} onChange={setQty} tone={tone} />
      </div>
      <button
        type="button"
        onClick={add}
        className={`card-value inline-flex h-10 min-h-10 w-full min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 transition-colors duration-[150ms] ease-out [@container(min-width:340px)]:w-auto ${buttonClass}`}
      >
        <Plus className="size-3.5 shrink-0" /> Add to quote
      </button>
    </div>
  );
}