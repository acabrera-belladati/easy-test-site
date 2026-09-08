const COMMON_ATTRIBUTE_LABELS = [
  "Contenido",
  "Conexiones",
  "Mandril",
  "Potencia",
  "Velocidades",
  "Voltaje",
  "Modelo",
  "Tipo de producto",
  "Origen",
  "Peso",
  "Alto",
  "Ancho",
  "Profundidad",
  "Color",
  "Incluye",
  "Garantía Proveedor",
  "Garantía Mínima Legal",
  "Torque máximo",
  "Capacidad",
  "Material"
];

function clean(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function parseMoney(text) {
  if (!text) return null;
  const value = Number(String(text).replace(/[^0-9]/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function hashCategory(parts) {
  const value = parts.join("/").toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return String(Math.abs(hash >>> 0)).padStart(8, "0").slice(0, 8);
}

function extractLineAfter(lines, label) {
  const index = lines.findIndex((line) => clean(line).toLowerCase() === label.toLowerCase());
  if (index < 0) return null;
  for (let i = index + 1; i < Math.min(lines.length, index + 4); i += 1) {
    const candidate = clean(lines[i]);
    if (candidate && !COMMON_ATTRIBUTE_LABELS.some((known) => known.toLowerCase() === candidate.toLowerCase())) return candidate;
  }
  return null;
}

function inferBrand(title, jsonLdBrand, breadcrumb = []) {
  if (jsonLdBrand) return clean(typeof jsonLdBrand === "string" ? jsonLdBrand : jsonLdBrand.name);
  const candidates = [...breadcrumb].reverse();
  for (const item of candidates) {
    const value = clean(item);
    if (value && value.length < 40 && title.toLowerCase().includes(value.toLowerCase())) return value;
  }
  const known = ["Makita", "Bosch", "DeWalt", "Dewalt", "Einhell", "Stanley", "Black & Decker", "Black+Decker", "Wesco", "Total", "Robust", "Lernen", "Flowmak", "Kolvok", "Hyundai", "Stihl", "Husqvarna"];
  return known.find((brand) => title.toLowerCase().includes(brand.toLowerCase())) ?? null;
}

export async function parseProductPage(page, sourceUrl) {
  const raw = await page.evaluate(() => {
    const text = document.body?.innerText ?? "";
    const title = document.querySelector("h1")?.textContent?.trim() ?? document.title;

    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map((node) => {
        try { return JSON.parse(node.textContent || "null"); } catch { return null; }
      })
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .find((value) => value && (value["@type"] === "Product" || (Array.isArray(value["@graph"]) && value["@graph"].some((x) => x?.["@type"] === "Product"))));

    const productLd = jsonLd?.["@type"] === "Product" ? jsonLd : jsonLd?.["@graph"]?.find((x) => x?.["@type"] === "Product") ?? null;

    const images = [...document.querySelectorAll("img")]
      .filter((img) => (img.alt || "").toLowerCase().includes((title || "").toLowerCase().slice(0, 30)))
      .map((img) => img.currentSrc || img.src)
      .filter(Boolean);

    const breadcrumbSelectors = [
      '[aria-label*="breadcrumb" i] a',
      '[class*="breadcrumb" i] a'
    ];
    let breadcrumbs = [];
    for (const selector of breadcrumbSelectors) {
      const values = [...document.querySelectorAll(selector)].map((a) => a.textContent?.trim()).filter(Boolean);
      if (values.length) { breadcrumbs = values; break; }
    }

    const main = document.querySelector("main") || document.body;
    const descriptionCandidates = [...main.querySelectorAll("h2, p")].map((el) => el.textContent?.trim()).filter(Boolean);

    return {
      text,
      title,
      productLd,
      images,
      breadcrumbs,
      descriptionCandidates
    };
  });

  const title = clean(raw.productLd?.name || raw.title);
  const lines = String(raw.text).split(/\r?\n/).map(clean).filter(Boolean);
  const lastTitleIndex = raw.text.lastIndexOf(title);
  const productSegment = lastTitleIndex >= 0 ? raw.text.slice(lastTitleIndex, lastTitleIndex + 5000) : raw.text.slice(-6000);

  const sku = clean(raw.productLd?.sku) || clean(productSegment.match(/\bSKU\s+([A-Za-z0-9-]+)/i)?.[1]) || clean(sourceUrl.match(/-(\d+)\/p\/?$/)?.[1]);
  const offer = Array.isArray(raw.productLd?.offers) ? raw.productLd.offers[0] : raw.productLd?.offers;
  const sellingPrice = Number(offer?.price) || parseMoney(productSegment.match(/\$\s*([\d.]+)/)?.[0]);
  const listPrice = parseMoney(productSegment.match(/(?:Normal|Precio normal)\s*:\s*\$\s*([\d.]+)/i)?.[0]) || sellingPrice;
  const discountPercentage = sellingPrice && listPrice && listPrice > sellingPrice ? Number((((listPrice - sellingPrice) / listPrice) * 100).toFixed(2)) : 0;

  const attributes = {};
  for (const label of COMMON_ATTRIBUTE_LABELS) {
    const value = extractLineAfter(lines, label);
    if (value) attributes[label] = value;
  }

  const breadcrumbs = raw.breadcrumbs.filter((item) => !/^inicio$/i.test(item) && clean(item) !== title);
  const categoryPath = breadcrumbs.length ? breadcrumbs : [];
  const brand = inferBrand(title, raw.productLd?.brand, breadcrumbs);
  const description = clean(raw.productLd?.description) || raw.descriptionCandidates.find((text) => text.length > 120 && text !== title) || "";
  const ldImages = Array.isArray(raw.productLd?.image) ? raw.productLd.image : raw.productLd?.image ? [raw.productLd.image] : [];
  const images = [...new Set([...ldImages, ...raw.images].filter(Boolean))].slice(0, 8);
  const imageUrl = images[0] ?? null;

  const availability = String(offer?.availability ?? "").toLowerCase();
  const unavailableText = /agotado|sin stock|no disponible/i.test(productSegment);
  const stock = availability.includes("outofstock") || unavailableText ? 0 : 1;

  const url = new URL(sourceUrl);
  url.search = "";
  url.hash = "";

  return {
    id: sku || `mock-${Date.now()}`,
    sku: sku || null,
    title,
    brand,
    sellingPrice,
    listPrice,
    discountPercentage,
    imageUrl,
    images,
    url: url.toString(),
    categoryPath,
    groupId: hashCategory(categoryPath.length ? categoryPath : ["uncategorized"]),
    description,
    attributes,
    stock,
    stockIsAvailabilityProxy: true,
    scrapedAt: new Date().toISOString(),
    source: "easy.cl"
  };
}
