import express from "express";
import { getProductsByIds, loadProducts } from "../catalog/repository.mjs";
import { localProductToSimple } from "../catalog/transform.mjs";
import { searchCatalog } from "../catalog/search.mjs";

export const catalogRouter = express.Router();

catalogRouter.get("/api/catalog/products", async (req, res, next) => {
  try {
    const ids = String(req.query.ids ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const products = ids.length ? await getProductsByIds(ids) : await loadProducts();
    res.json({ products: products.slice(0, 50).map(localProductToSimple) });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get("/api/catalog/search", async (req, res, next) => {
  try {
    const products = await loadProducts();
    const result = searchCatalog(products, {
      term: String(req.query.term ?? ""),
      pagination: { pageSize: Number(req.query.limit ?? 8), page: 1 }
    });
    res.json({ products: result.products.map(localProductToSimple), totalSize: result.totalSize });
  } catch (error) {
    next(error);
  }
});
