import { readFile } from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.resolve(import.meta.dirname, "../../data/products.json");

export async function loadProducts() {
  const raw = await readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.products ?? [];
}

export async function getProductsByIds(ids = []) {
  const wanted = new Set(ids.map(String));
  const products = await loadProducts();
  return products.filter((product) => wanted.has(String(product.id)) || wanted.has(String(product.sku)));
}
