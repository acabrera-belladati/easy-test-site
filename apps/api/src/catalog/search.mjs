function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
}

function standardAttribute(product, key) {
  const attrs = product.attributes ?? {};
  const lookup = {
    BrandName: product.brand,
    sellingPrice: product.sellingPrice,
    listPrice: product.listPrice,
    price: product.sellingPrice,
    discountPercentage: product.discountPercentage,
    image_url: product.imageUrl,
    images: product.images,
    url: product.url,
    RefId: product.sku ?? product.id,
    stockLevel: Number(product.stock ?? 0) > 0 ? "in-stock" : "out-of-stock",
    ProductCategories: JSON.stringify(product.categoryPath ?? []),
    group_id: product.groupId,
    "Tipo de producto": attrs["Tipo de producto"] ?? attrs["Tipo producto"]
  };
  if (Object.prototype.hasOwnProperty.call(lookup, key)) return lookup[key];
  return attrs[key];
}

function numericValue(value) {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return numericValue(value[0]);
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/\./g, "").replace(",", ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function matchesFilter(product, filter) {
  const value = standardAttribute(product, filter.key);

  if (filter.numberRange) {
    const numeric = numericValue(value);
    if (numeric === null) return false;
    if (filter.numberRange.min !== undefined && filter.numberRange.min !== null && numeric < Number(filter.numberRange.min)) return false;
    if (filter.numberRange.max !== undefined && filter.numberRange.max !== null && numeric > Number(filter.numberRange.max)) return false;
  }

  if (filter.stringValues?.length) {
    const actualValues = asArray(value).map(normalize);
    const wanted = filter.stringValues.map(normalize);
    if (!wanted.some((candidate) => actualValues.includes(candidate))) return false;
  }

  return true;
}

function searchableText(product) {
  return normalize([
    product.title,
    product.brand,
    product.description,
    ...(product.categoryPath ?? []),
    ...Object.entries(product.attributes ?? {}).flatMap(([key, value]) => [key, ...asArray(value)])
  ].join(" "));
}

function relevance(product, term) {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return 0;
  const title = normalize(product.title);
  const brand = normalize(product.brand);
  const haystack = searchableText(product);
  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
  let score = title.includes(normalizedTerm) ? 20 : 0;
  if (brand && normalizedTerm.includes(brand)) score += 5;
  for (const token of tokens) {
    if (title.includes(token)) score += 4;
    else if (haystack.includes(token)) score += 1;
  }
  return score;
}

function matchesTerm(product, term) {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return true;
  const haystack = searchableText(product);
  const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function sortProducts(items, sortBy, term) {
  const mode = sortBy || "relevance desc";
  const copy = [...items];
  if (mode === "price asc") return copy.sort((a, b) => Number(a.sellingPrice ?? Infinity) - Number(b.sellingPrice ?? Infinity));
  if (mode === "price desc") return copy.sort((a, b) => Number(b.sellingPrice ?? -Infinity) - Number(a.sellingPrice ?? -Infinity));
  if (mode === "discount desc") return copy.sort((a, b) => Number(b.discountPercentage ?? 0) - Number(a.discountPercentage ?? 0));
  return copy.sort((a, b) => relevance(b, term) - relevance(a, term));
}

function addFacetValue(map, key, label, value) {
  if (value === null || value === undefined || value === "") return;
  const values = asArray(value);
  if (!map.has(key)) map.set(key, { key, name: label, counts: new Map() });
  const facet = map.get(key);
  for (const item of values) {
    const display = String(item).trim();
    if (!display) continue;
    facet.counts.set(display, (facet.counts.get(display) ?? 0) + 1);
  }
}

export function buildFacets(products) {
  const map = new Map();
  for (const product of products) {
    addFacetValue(map, "BrandName", "Marca", product.brand);
    addFacetValue(map, "group_id", "Categoría", product.groupId);
    for (const [key, value] of Object.entries(product.attributes ?? {})) {
      if (typeof value === "number") continue;
      addFacetValue(map, key, key, value);
    }
  }

  const facets = [...map.values()]
    .filter((facet) => facet.counts.size > 0 && facet.counts.size <= 40)
    .slice(0, 16)
    .map((facet) => ({
      key: facet.key,
      name: facet.name,
      values: [...facet.counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([value, count]) => ({
          value,
          displayName: value,
          count: String(count),
          minValue: null,
          maxValue: null
        }))
    }));

  const prices = products.map((p) => Number(p.sellingPrice)).filter(Number.isFinite);
  if (prices.length) {
    facets.push({
      key: "sellingPrice",
      name: "Precio",
      values: [{
        value: "sellingPrice",
        displayName: "Precio",
        count: String(prices.length),
        minValue: Math.min(...prices),
        maxValue: Math.max(...prices)
      }]
    });
  }
  return facets;
}

export function searchCatalog(products, input = {}) {
  const term = input.term ?? "";
  const filters = Array.isArray(input.filters) ? input.filters : [];
  const filtered = products
    .filter((product) => matchesTerm(product, term))
    .filter((product) => filters.every((filter) => matchesFilter(product, filter)));

  const sorted = sortProducts(filtered, input.sortBy, term);
  const pageSize = Math.min(50, Math.max(1, Number(input.pagination?.pageSize ?? 10)));
  const page = Math.max(1, Number(input.pagination?.page ?? 1));
  const start = (page - 1) * pageSize;

  return {
    totalSize: sorted.length,
    correctedQuery: null,
    products: sorted.slice(start, start + pageSize),
    facets: buildFacets(filtered)
  };
}

export function getAttribute(product, key) {
  return standardAttribute(product, key);
}
