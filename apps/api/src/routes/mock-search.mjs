import express from "express";
import { loadProducts } from "../catalog/repository.mjs";
import { searchCatalog } from "../catalog/search.mjs";
import { productToGraphQL } from "../catalog/transform.mjs";
import { requireMockApiKey } from "../middleware/api-key.mjs";

export const mockSearchRouter = express.Router();

mockSearchRouter.post("/v1/graphql", requireMockApiKey, async (req, res, next) => {
  try {
    const { query, variables } = req.body ?? {};
    const input = variables?.input;
    if (!query || !input) return res.status(400).json({ message: "query and variables.input are required" });
    if (!String(query).includes("Search") || !String(query).includes("search")) {
      return res.status(400).json({ message: "Only the Search query is supported by this POC mock" });
    }
    if (input.visitorId && input.visitorId !== "ElevenLabs") {
      return res.status(400).json({ message: "visitorId must be ElevenLabs" });
    }

    const products = await loadProducts();
    const result = searchCatalog(products, input);
    return res.json({
      data: {
        search: {
          totalSize: result.totalSize,
          correctedQuery: result.correctedQuery,
          products: result.products.map(productToGraphQL),
          facets: result.facets
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
