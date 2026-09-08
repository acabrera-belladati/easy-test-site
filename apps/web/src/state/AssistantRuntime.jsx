import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

const AssistantRuntimeContext = createContext(null);

const initialMessages = [
  {
    id: "welcome",
    role: "assistant",
    text: "¡Hola! Soy tu asistente Easy. Contame qué necesitás para tu proyecto y te ayudo a encontrar opciones."
  }
];

const hiddenComparisonLabels = new Set([
  "image_url",
  "images",
  "url",
  "refid",
  "group_id",
  "productcategories",
  "stocklevel"
]);

function normalizeMessage(event) {
  if (!event) return null;

  const text =
    typeof event.message === "string"
      ? event.message
      : event.message?.message ||
        event.message?.text ||
        event.text;

  if (!text || typeof text !== "string") return null;

  const source = String(event.source || "ai").toLowerCase();

  return {
    role: source === "user" ? "user" : "assistant",
    text: text.trim()
  };
}

function plainText(value, fallback = "") {
  const text = String(value ?? fallback)
    .replace(/\*+/g, "")
    .trim();

  return text || fallback;
}

function normalizeClientCard(payload = {}) {
  return {
    id:
      plainText(payload.product_id) ||
      `client-${crypto.randomUUID()}`,

    title: plainText(
      payload.title,
      "Producto Easy"
    ),

    brand: null,

    imageUrl: plainText(
      payload.image_url,
      "/product-placeholder.svg"
    ),

    displayPrice: plainText(
      payload.price,
      "Consultar"
    ),

    sellingPrice: null,
    listPrice: null,

    url: plainText(payload.url) || null,

    stock: null,

    attributes: {},

    source: "elevenlabs-client-tool"
  };
}

function normalizeComparisonProducts(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products
    .slice(0, 3)
    .map((product, index) => {
      const attributes = Array.isArray(product?.attributes)
        ? product.attributes
            .map((attribute) => ({
              label: plainText(attribute?.label),
              value: plainText(
                attribute?.value,
                "—"
              )
            }))
            .filter(
              (attribute) =>
                attribute.label &&
                !hiddenComparisonLabels.has(
                  attribute.label.toLowerCase()
                )
            )
        : [];

      return {
        id: `comparison-${index}`,
        name: plainText(
          product?.name,
          `Producto ${index + 1}`
        ),
        attributes
      };
    });
}

export function AssistantRuntimeProvider({ children }) {
  const [messages, setMessages] = useState(initialMessages);
  const [products, setProducts] = useState([]);
  const [presentation, setPresentation] = useState("cards");
  const [lastError, setLastError] = useState(null);
  const [connectedAt, setConnectedAt] = useState(null);

  const appendMessage = useCallback((next) => {
    setMessages((previous) => {
      if (!next?.text) return previous;

      const last = previous.at(-1);

      if (last?.role === next.role) {
        if (last.text === next.text) {
          return previous;
        }

        if (
          next.text.startsWith(last.text) ||
          last.text.startsWith(next.text)
        ) {
          return [
            ...previous.slice(0, -1),
            {
              ...last,
              text: next.text
            }
          ];
        }
      }

      return [
        ...previous,
        {
          ...next,
          id: crypto.randomUUID()
        }
      ];
    });
  }, []);

  const onMessage = useCallback(
    (event) => {
      const normalized = normalizeMessage(event);

      if (normalized) {
        appendMessage(normalized);
      }
    },
    [appendMessage]
  );

  const onConnect = useCallback(() => {
    setConnectedAt(new Date());
    setLastError(null);
  }, []);

  const onDisconnect = useCallback(() => {
    setConnectedAt(null);
  }, []);

  const onError = useCallback((error) => {
    console.error("ElevenLabs error", error);
    setLastError(error?.message || String(error));
  }, []);

  const fetchProducts = useCallback(async (ids) => {
    const list = Array.isArray(ids)
      ? ids.filter(Boolean)
      : [];

    if (!list.length) {
      return [];
    }

    const response = await fetch(
      `/api/catalog/products?ids=${encodeURIComponent(
        list.join(",")
      )}`
    );

    if (!response.ok) {
      throw new Error(
        "No se pudieron resolver los productos para el widget"
      );
    }

    const payload = await response.json();

    return payload.products || [];
  }, []);

  const showProducts = useCallback(
    async ({
      product_ids: productIds = []
    } = {}) => {
      const resolved = await fetchProducts(productIds);

      setProducts(resolved);
      setPresentation("cards");

      return `Mostrando ${resolved.length} productos`;
    },
    [fetchProducts]
  );

  const showComparison = useCallback(
    async ({
      product_ids: productIds = []
    } = {}) => {
      const resolved = await fetchProducts(productIds);

      setProducts(resolved.slice(0, 3));
      setPresentation("comparison");

      return `Comparando ${resolved.length} productos`;
    },
    [fetchProducts]
  );

  const displayProductCard = useCallback(
    async (payload = {}) => {
      console.info(
        "[ClientTool] display_product_card",
        payload
      );

      const next = normalizeClientCard(payload);

      setProducts((previous) => {
        const withoutDuplicate = previous.filter(
          (product) => product.id !== next.id
        );

        return [
          ...withoutDuplicate,
          next
        ].slice(-6);
      });

      setPresentation("cards");
      setLastError(null);
    },
    []
  );

  const displayComparisonTable = useCallback(
    async ({
      products: comparisonProducts = []
    } = {}) => {
      console.info(
        "[ClientTool] display_comparison_table",
        comparisonProducts
      );

      const normalized = normalizeComparisonProducts(
        comparisonProducts
      );

      setProducts(normalized);
      setPresentation("comparison");
      setLastError(null);
    },
    []
  );

  const value = useMemo(
    () => ({
      messages,
      products,
      presentation,
      lastError,
      connectedAt,

      onMessage,
      onConnect,
      onDisconnect,
      onError,

      showProducts,
      showComparison,

      displayProductCard,
      displayComparisonTable,

      appendMessage
    }),
    [
      messages,
      products,
      presentation,
      lastError,
      connectedAt,
      onMessage,
      onConnect,
      onDisconnect,
      onError,
      showProducts,
      showComparison,
      displayProductCard,
      displayComparisonTable,
      appendMessage
    ]
  );

  return (
    <AssistantRuntimeContext.Provider value={value}>
      {children}
    </AssistantRuntimeContext.Provider>
  );
}

export function useAssistantRuntime() {
  const value = useContext(AssistantRuntimeContext);

  if (!value) {
    throw new Error(
      "useAssistantRuntime must be used inside AssistantRuntimeProvider"
    );
  }

  return value;
}
