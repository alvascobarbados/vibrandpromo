import { Link } from "@tanstack/react-router";

import { formatPrice, productImage, type Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const price = product.show_price ? formatPrice(product.price) : null;

  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={productImage(product)}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold leading-snug text-foreground">{product.name}</h3>
        {product.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        ) : null}
        <p className="mt-auto pt-2 text-sm font-semibold text-primary">
          {price ?? "Request Pricing"}
        </p>
      </div>
    </Link>
  );
}