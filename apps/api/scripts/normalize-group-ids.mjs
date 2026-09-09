import fs from "node:fs/promises";
import path from "node:path";

const PRODUCTS_PATH = path.resolve(
  "apps/api/data/products.json"
);

const BASE_GROUP_ID = 22960928;

const GROUPS = [
  {
    id: String(BASE_GROUP_ID),
    name: "Herramientas eléctricas",
    keywords: [
      "taladro",
      "atornillador",
      "percutor",
      "makita",
      "broquero",
      "mandril"
    ]
  },
  {
    id: String(BASE_GROUP_ID + 1),
    name: "Refrigeradores",
    keywords: [
      "refrigerador",
      "refrigeración",
      "freezer",
      "nevera",
      "heladera"
    ]
  },
  {
    id: String(BASE_GROUP_ID + 2),
    name: "Pinturas",
    keywords: [
      "pintura",
      "esmalte",
      "pasta muro",
      "galón",
      "tineta",
      "behr",
      "tajamar",
      "sipa"
    ]
  },
  {
    id: String(BASE_GROUP_ID + 3),
    name: "Calefacción",
    keywords: [
      "estufa",
      "calefactor",
      "calefacción",
      "termoventilador",
      "convector",
      "parafina"
    ]
  },
  {
    id: String(BASE_GROUP_ID + 4),
    name: "Iluminación",
    keywords: [
      "lámpara",
      "lampara",
      "spot",
      "foco",
      "plafón",
      "plafon",
      "farol",
      "ampolleta",
      "led",
      "iluminación",
      "iluminacion"
    ]
  }
];

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function classify(product) {
  const text = normalize(
    `${product.title ?? ""} ${product.description ?? ""}`
  );

  let bestGroup = null;
  let bestScore = 0;

  for (const group of GROUPS) {
    let score = 0;

    for (const keyword of group.keywords) {
      const normalizedKeyword = normalize(keyword);

      if (text.includes(normalizedKeyword)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestGroup = group;
    }
  }

  return bestGroup;
}

async function main() {
  const raw = await fs.readFile(
    PRODUCTS_PATH,
    "utf8"
  );

  const products = JSON.parse(raw);

  const counters = new Map(
    GROUPS.map((group) => [group.name, 0])
  );

  const unresolved = [];

  const updated = products.map((product) => {
    const group = classify(product);

    if (!group) {
      unresolved.push({
        id: product.id,
        title: product.title
      });

      return product;
    }

    counters.set(
      group.name,
      counters.get(group.name) + 1
    );

    return {
      ...product,
      groupId: group.id
    };
  });

  await fs.writeFile(
    PRODUCTS_PATH,
    JSON.stringify(updated, null, 2),
    "utf8"
  );

  console.log("\nGroup IDs actualizados:\n");

  for (const group of GROUPS) {
    console.log(
      `${group.id} | ${group.name}: ` +
      `${counters.get(group.name)} productos`
    );
  }

  if (unresolved.length > 0) {
    console.log(
      "\nProductos que no pudieron clasificarse:"
    );

    for (const item of unresolved) {
      console.log(
        `- ${item.id}: ${item.title}`
      );
    }
  }

  console.log(
    `\nTotal: ${updated.length} productos`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});