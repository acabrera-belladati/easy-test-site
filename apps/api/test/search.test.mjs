import test from "node:test";
import assert from "node:assert/strict";
import { searchCatalog } from "../src/catalog/search.mjs";

const products = [
  { id: "1", title: "Taladro Makita 18V", brand: "Makita", sellingPrice: 159990, attributes: { Conexiones: "Inalámbrico", Voltaje: "18V" } },
  { id: "2", title: "Taladro Bosch 12V", brand: "Bosch", sellingPrice: 99990, attributes: { Conexiones: "Inalámbrico", Voltaje: "12V" } },
  { id: "3", title: "Sierra Makita", brand: "Makita", sellingPrice: 89990, attributes: { Conexiones: "Alámbrico" } }
];

test("filters by term and brand", () => {
  const result = searchCatalog(products, {
    term: "taladro",
    filters: [{ key: "BrandName", stringValues: ["Makita"] }],
    pagination: { pageSize: 10, page: 1 }
  });
  assert.equal(result.totalSize, 1);
  assert.equal(result.products[0].id, "1");
});

test("filters by price range", () => {
  const result = searchCatalog(products, {
    term: "taladro",
    filters: [{ key: "sellingPrice", numberRange: { max: 120000 } }],
    pagination: { pageSize: 10, page: 1 }
  });
  assert.equal(result.totalSize, 1);
  assert.equal(result.products[0].brand, "Bosch");
});

test("returns facets", () => {
  const result = searchCatalog(products, { term: "taladro", pagination: { pageSize: 10, page: 1 } });
  const brandFacet = result.facets.find((facet) => facet.key === "BrandName");
  assert.ok(brandFacet);
  assert.equal(brandFacet.values.length, 2);
});
