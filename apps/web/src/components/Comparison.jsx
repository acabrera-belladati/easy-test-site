function formatPrice(value) {
  if (value == null) {
    return "—";
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

function normalizeProduct(product) {
  if (Array.isArray(product.attributes)) {
    return {
      id: product.id,
      name:
        product.name ||
        product.title ||
        "Producto",
      attributes:
        product.attributes
    };
  }

  const attributes = [];

  if (product.sellingPrice != null) {
    attributes.push({
      label: "Precio",
      value: formatPrice(
        product.sellingPrice
      )
    });
  }

  for (const [label, rawValue] of
    Object.entries(
      product.attributes || {}
    )) {

    const value = Array.isArray(
      rawValue
    )
      ? rawValue.join(", ")
      : String(rawValue ?? "—");

    attributes.push({
      label,
      value
    });
  }

  return {
    id: product.id,
    name:
      product.title ||
      product.name ||
      product.brand ||
      "Producto",
    attributes
  };
}

function valueFor(product, label) {
  const attribute =
    product.attributes.find(
      (item) => item.label === label
    );

  return attribute?.value || "—";
}

export function Comparison({
  products = []
}) {
  const normalized =
    products.map(normalizeProduct);

  const labels = [];
  const seen = new Set();

  for (const product of normalized) {
    for (const attribute of product.attributes) {
      if (
        !attribute?.label ||
        seen.has(attribute.label)
      ) {
        continue;
      }

      seen.add(attribute.label);
      labels.push(attribute.label);
    }
  }

  if (!normalized.length) {
    return null;
  }

  return (
    <div className="comparison-scroll">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Característica</th>

            {normalized.map(
              (product) => (
                <th key={product.id}>
                  {product.name}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {labels.map((label) => (
            <tr key={label}>
              <td>{label}</td>

              {normalized.map(
                (product) => (
                  <td key={product.id}>
                    {valueFor(
                      product,
                      label
                    )}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
