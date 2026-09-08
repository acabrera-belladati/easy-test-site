import express from "express";
import { requireMockApiKey } from "../middleware/api-key.mjs";
import { buildInputFromTool } from "../cencosud/request.mjs";
import { searchRealCencosud } from "../cencosud/real-adapter.mjs";
import { loadProducts } from "../catalog/repository.mjs";
import { searchCatalog } from "../catalog/search.mjs";
import { graphQLToSimpleProduct, localProductToSimple } from "../catalog/transform.mjs";

export const toolsRouter = express.Router();

toolsRouter.post("/tools/search-products", requireMockApiKey, async (req, res, next) => {
  try {
    const input = buildInputFromTool(req.body ?? {});
    const useReal = String(process.env.USE_REAL_CENCOSUD_API ?? "false").toLowerCase() === "true";

    if (useReal) {
      const payload = await searchRealCencosud(input);
      const search = payload?.data?.search;
      if (!search) return res.status(502).json({ message: "Unexpected response from Cencosud Search API", raw: payload });
      return res.json({
        totalSize: search.totalSize ?? 0,
        correctedQuery: search.correctedQuery ?? null,
        products: (search.products ?? []).map(graphQLToSimpleProduct),
        facets: search.facets ?? [],
        source: "cencosud-api"
      });
    }

    const products = await loadProducts();
    const result = searchCatalog(products, input);
    return res.json({
      totalSize: result.totalSize,
      correctedQuery: result.correctedQuery,
      products: result.products.map(localProductToSimple),
      facets: result.facets,
      source: "scraped-mock"
    });
  } catch (error) {
    next(error);
  }
});
