export const SEARCH_QUERY = `query Search($input: SearchInputDTO!) { search(input: $input) { totalSize correctedQuery products { id title attributes { name stringValues numberValues } skus { id stock } } facets { key name values { value displayName count minValue maxValue } } } }`;

export const DEFAULT_APPLICATION_ID = "34bb8686968a85a272a6c546ddcb9860db1ea14ee72f5207ef0c028280a6e7bc";

export function buildInputFromTool(body = {}) {
  const filters = Array.isArray(body.filters) ? [...body.filters] : [];
  if (body.brand) filters.push({ key: "BrandName", stringValues: [body.brand] });
  if (body.minPrice !== undefined || body.maxPrice !== undefined) {
    filters.push({
      key: "sellingPrice",
      numberRange: {
        ...(body.minPrice !== undefined ? { min: Number(body.minPrice) } : {}),
        ...(body.maxPrice !== undefined ? { max: Number(body.maxPrice) } : {})
      }
    });
  }

  return {
    term: body.term ?? "",
    filters,
    storeIds: ["easycl"],
    salesChannel: ["3"],
    visitorId: "ElevenLabs",
    applicationId: process.env.CENCOSUD_APPLICATION_ID || DEFAULT_APPLICATION_ID,
    sponsoredProducts: false,
    sortBy: body.sortBy ?? "relevance desc",
    pagination: {
      pageSize: Math.min(20, Math.max(1, Number(body.pageSize ?? 5))),
      page: Math.max(1, Number(body.page ?? 1))
    }
  };
}

export function buildGraphQLRequest(input) {
  return { query: SEARCH_QUERY, variables: { input } };
}
