function toAttribute(name, value) {
  if (value === undefined || value === null || value === "") return null;
  const values = Array.isArray(value) ? value : [value];
  if (!values.length) return null;
  const numeric = values.every((item) => typeof item === "number" && Number.isFinite(item));
  return {
    name,
    stringValues: numeric ? null : values.map((item) => String(item)),
    numberValues: numeric ? values : null
  };
}

export function productToGraphQL(product) {
  const standard = [
    ["sellingPrice", product.sellingPrice],
    ["listPrice", product.listPrice],
    ["price", product.sellingPrice],
    ["discountPercentage", product.discountPercentage],
    ["BrandName", product.brand],
    ["image_url", product.imageUrl],
    ["images", product.images],
    ["url", product.url],
    ["RefId", product.sku ?? product.id],
    ["stockLevel", Number(product.stock ?? 0) > 0 ? "in-stock" : "out-of-stock"],
    ["ProductCategories", JSON.stringify(product.categoryPath ?? [])],
    ["group_id", product.groupId]
  ];

  const dynamic = Object.entries(product.attributes ?? {});
  const seen = new Set();
  const attributes = [];
  for (const [name, value] of [...standard, ...dynamic]) {
    if (seen.has(name)) continue;
    seen.add(name);
    const attribute = toAttribute(name, value);
    if (attribute) attributes.push(attribute);
  }

  return {
    id: String(product.id),
    title: product.title,
    attributes,
    skus: [{ id: String(product.sku ?? product.id), stock: Number(product.stock ?? 0) }]
  };
}

export function graphQLToSimpleProduct(product) {
  const attrs = Object.fromEntries((product.attributes ?? []).map((attr) => [
    attr.name,
    attr.stringValues?.length ? (attr.stringValues.length === 1 ? attr.stringValues[0] : attr.stringValues) :
      attr.numberValues?.length ? (attr.numberValues.length === 1 ? attr.numberValues[0] : attr.numberValues) : null
  ]));

  const reserved = new Set(["sellingPrice", "listPrice", "price", "discountPercentage", "BrandName", "image_url", "images", "url", "RefId", "stockLevel", "ProductCategories", "group_id"]);
  const dynamic = Object.fromEntries(Object.entries(attrs).filter(([key]) => !reserved.has(key)));

  return {
    id: String(product.id),
    title: product.title,
    brand: attrs.BrandName ?? null,
    sellingPrice: attrs.sellingPrice ?? attrs.price ?? null,
    listPrice: attrs.listPrice ?? null,
    discountPercentage: attrs.discountPercentage ?? null,
    imageUrl: attrs.image_url ?? null,
    images: Array.isArray(attrs.images) ? attrs.images : attrs.images ? [attrs.images] : [],
    url: attrs.url ?? null,
    stock: Number(product.skus?.reduce((sum, sku) => sum + Number(sku.stock ?? 0), 0) ?? 0),
    attributes: dynamic
  };
}

export function localProductToSimple(product) {
  return {
    id: String(product.id),
    title: product.title,
    brand: product.brand ?? null,
    sellingPrice: product.sellingPrice ?? null,
    listPrice: product.listPrice ?? null,
    discountPercentage: product.discountPercentage ?? null,
    imageUrl: product.imageUrl ?? null,
    images: product.images ?? [],
    url: product.url ?? null,
    stock: Number(product.stock ?? 0),
    attributes: product.attributes ?? {}
  };
}
