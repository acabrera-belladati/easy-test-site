function formatPrice(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Consultar";
  }

  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0
    }
  ).format(value);
}

export function ProductCard({
  product,
  compact = false
}) {
  return (
    <article
      className={`product-card ${
        compact
          ? "product-card--compact"
          : ""
      }`}
    >
      <div className="product-card__image">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
          />
        ) : (
          <div className="product-placeholder">
            🛠️
          </div>
        )}
      </div>

      <div className="product-card__body">
        {product.brand ? (
          <div className="product-card__brand">
            {product.brand}
          </div>
        ) : null}

        <div className="product-card__title">
          {product.title}
        </div>

        {product.listPrice &&
        product.sellingPrice &&
        product.listPrice >
          product.sellingPrice ? (
          <div className="product-card__normal">
            Normal:{" "}
            {formatPrice(
              product.listPrice
            )}
          </div>
        ) : null}

        <div className="product-card__price">
          {product.displayPrice ||
            formatPrice(
              product.sellingPrice
            )}
        </div>

        {product.stock !== null &&
        product.stock !== undefined ? (
          <div
            className={`stock-chip ${
              product.stock > 0
                ? "stock-chip--ok"
                : "stock-chip--out"
            }`}
          >
            {product.stock > 0
              ? "Disponible"
              : "Sin stock"}
          </div>
        ) : null}

        {product.url ? (
          <a
            className="product-card__link"
            href={product.url}
            target="_blank"
            rel="noreferrer"
          >
            Ver producto
          </a>
        ) : null}
      </div>
    </article>
  );
}
